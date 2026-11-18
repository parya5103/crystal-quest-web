#include "CrystalQuestScene.h"
#include <array>
#include <algorithm>
#include <string>
#include <rapidjson/document.h>
USING_NS_CC;
using namespace gogo::crystal;
Scene* CrystalQuestScene::createScene() {
 auto scene=Scene::create(); auto layer=CrystalQuestScene::create();
 if(layer) scene->addChild(layer);
 return scene;
}
bool CrystalQuestScene::init() {
 if(!Layer::init()) return false;
 auto size=Director::getInstance()->getVisibleSize(); auto origin=Director::getInstance()->getVisibleOrigin();
 auto title=Label::createWithSystemFont("CRYSTAL QUEST","Arial",34);
 title->setPosition(origin.x+size.width/2,origin.y+size.height-82); addChild(title);
 status_=Label::createWithSystemFont("Loading campaign…","Arial",19);
 status_->setPosition(origin.x+size.width/2,origin.y+size.height-128); addChild(status_);
 scoreLabel_=Label::createWithSystemFont("Score: 0","Arial",20);
 scoreLabel_->setPosition(origin.x+size.width/2,origin.y+size.height-166); addChild(scoreLabel_);
 moves_=Label::createWithSystemFont("Moves: —","Arial",22);
 moves_->setPosition(origin.x+size.width/2,origin.y+72); addChild(moves_);
 currentLevel_=std::max(1,UserDefault::getInstance()->getIntegerForKey("crystalquest.native.level.v1",1));
 if(!loadLevel(currentLevel_)) setStatus("Campaign asset missing — build with export-native-levels.js");
 auto listener=EventListenerTouchOneByOne::create();
 listener->onTouchBegan=CC_CALLBACK_2(CrystalQuestScene::onTouchBegan,this);
 _eventDispatcher->addEventListenerWithSceneGraphPriority(listener,this);
 return true;
}
bool CrystalQuestScene::loadLevel(int level) {
 if(level<1||level>27) { setStatus("All 27 campaign levels complete!"); return false; }
 const auto path="levels/level-"+std::to_string(level)+".json";
 const auto raw=FileUtils::getInstance()->getStringFromFile(path);
 if(raw.empty()) { setStatus("Cannot load "+path); return false; }
 rapidjson::Document doc; doc.Parse(raw.c_str());
 if(doc.HasParseError()||!doc.IsObject()||!doc.HasMember("grid")||!doc["grid"].IsArray()||
    !doc.HasMember("moves")||!doc["moves"].IsInt()) { setStatus("Campaign level data is invalid"); return false; }
 const int height=static_cast<int>(doc["grid"].Size());
 if(height<3||height>20||!doc["grid"][0].IsArray()) { setStatus("Invalid campaign grid"); return false; }
 const int width=static_cast<int>(doc["grid"][0].Size());
 Board next(width,height);
 for(int y=0;y<height;++y) {
  const auto& row=doc["grid"][static_cast<rapidjson::SizeType>(y)];
  if(!row.IsArray()||static_cast<int>(row.Size())!=width) { setStatus("Campaign grid dimensions mismatch"); return false; }
  for(int x=0;x<width;++x) {
   const auto i=static_cast<std::size_t>(y*width+x);
   const auto& cell=row[static_cast<rapidjson::SizeType>(x)];
   if(cell.IsNull()) { next.active[i]=0; continue; }
   if(!cell.IsObject()||!cell.HasMember("k")||!cell["k"].IsString()) { setStatus("Invalid campaign cell"); return false; }
   const std::string kind=cell["k"].GetString();
   if(kind=="g"&&cell.HasMember("g")&&cell["g"].IsInt()) {
    const int gem=cell["g"].GetInt();
    if(gem<0||gem>5) { setStatus("Invalid gem colour"); return false; }
    next.cells[i]=static_cast<Gem>(gem+1);
   } else if(kind=="b") {
    next.blockers[i]=1;
    next.blockerHp[i]=cell.HasMember("hp")&&cell["hp"].IsInt()?static_cast<std::uint8_t>(std::max(1,cell["hp"].GetInt())):1;
   } else if(kind!="e") { setStatus("Unsupported campaign cell type"); return false; }
  }
 }
 board_=std::move(next); currentLevel_=level; levelComplete_=false; selected_.reset();
 movesLeft_=doc["moves"].GetInt(); score_=0;
 scoreTarget_=doc.HasMember("scoreTarget")&&doc["scoreTarget"].IsInt()?doc["scoreTarget"].GetInt():0;
 levelName_=doc.HasMember("name")&&doc["name"].IsString()?doc["name"].GetString():"Crystal Level";
 moves_->setString("Moves: "+std::to_string(movesLeft_));
 scoreLabel_->setString("Score: 0 / "+std::to_string(scoreTarget_));
 setStatus("Level "+std::to_string(level)+" · "+levelName_);
 auto size=Director::getInstance()->getVisibleSize(); auto origin=Director::getInstance()->getVisibleOrigin();
 cellSize_=std::min((size.width-36)/static_cast<float>(width),(size.height-290)/static_cast<float>(height));
 boardOrigin_=Vec2(origin.x+(size.width-cellSize_*width)/2,origin.y+(size.height-cellSize_*height)/2-5);
 redraw(); return true;
}
bool CrystalQuestScene::pointToCell(const Vec2& point,Cell& out) const {
 const auto p=convertToNodeSpace(point)-boardOrigin_;
 if(p.x<0||p.y<0||p.x>=cellSize_*board_.width||p.y>=cellSize_*board_.height) return false;
 out={static_cast<int>(p.x/cellSize_),static_cast<int>(p.y/cellSize_)};
 return true;
}
bool CrystalQuestScene::onTouchBegan(Touch* touch,Event*) {
 if(levelComplete_) {
  if(touch->getLocation().y<boardOrigin_.y-18) loadLevel(currentLevel_+1);
  return true;
 }
 if(movesLeft_<=0) {
  if(touch->getLocation().y<boardOrigin_.y-18) loadLevel(currentLevel_);
  return true;
 }
 Cell cell{}; if(!pointToCell(touch->getLocation(),cell)) return false;
 const auto idx=static_cast<std::size_t>(cell.y*board_.width+cell.x);
 if(!board_.isActive(idx)||board_.isBlocker(idx)) { selected_.reset(); setStatus("That tile is blocked"); redraw(); return true; }
 if(!selected_) { selected_=cell; redraw(); return true; }
 const Cell first=*selected_; selected_.reset();
 if(adjacent(first,cell)&&swapIfMatch(board_,first,cell)) {
  const auto result=resolveCascades(board_,++turnSeed_);
  --movesLeft_; score_+=result.cleared*60+std::max(0,result.cascades-1)*120;
  moves_->setString("Moves: "+std::to_string(movesLeft_));
  scoreLabel_->setString("Score: "+std::to_string(score_)+" / "+std::to_string(scoreTarget_));
  if(scoreTarget_>0&&score_>=scoreTarget_) {
   levelComplete_=true;
   UserDefault::getInstance()->setIntegerForKey("crystalquest.native.level.v1",std::min(27,currentLevel_+1));
   UserDefault::getInstance()->flush();
   setStatus("Level clear! Tap below to continue");
  } else if(movesLeft_<=0) setStatus("Out of moves — tap below to retry");
  else setStatus("Cleared "+std::to_string(result.cleared)+" crystals · "+std::to_string(result.cascades)+" cascade(s)");
 } else setStatus("No match — choose an adjacent pair");
 redraw(); return true;
}
void CrystalQuestScene::setStatus(const std::string& value) { if(status_) status_->setString(value); }
void CrystalQuestScene::redraw() {
 removeChildByTag(900,true); auto draw=DrawNode::create();
 const std::array<Color4F,6> colours={Color4F(1.0f,.62f,.18f,1),Color4F(.18f,.85f,.95f,1),
  Color4F(.98f,.35f,.53f,1),Color4F(.25f,.82f,.48f,1),Color4F(.62f,.38f,.95f,1),Color4F(1.0f,.82f,.2f,1)};
 for(int y=0;y<board_.height;++y) for(int x=0;x<board_.width;++x) {
  const auto index=static_cast<std::size_t>(y*board_.width+x);
  const Vec2 center=boardOrigin_+Vec2((x+.5f)*cellSize_,(y+.5f)*cellSize_);
  if(!board_.isActive(index)) {
   draw->drawSolidRect(center-Vec2(cellSize_*.48f,cellSize_*.48f),center+Vec2(cellSize_*.48f,cellSize_*.48f),Color4F(.035f,.045f,.08f,1)); continue;
  }
  draw->drawSolidRect(center-Vec2(cellSize_*.47f,cellSize_*.47f),center+Vec2(cellSize_*.47f,cellSize_*.47f),Color4F(.10f,.13f,.22f,1));
  if(board_.isBlocker(index)) {
   const auto hp=board_.blockerHp.empty()?1:board_.blockerHp[index];
   draw->drawSolidRect(center-Vec2(cellSize_*.34f,cellSize_*.34f),center+Vec2(cellSize_*.34f,cellSize_*.34f),Color4F(.42f,.52f,.68f,.95f));
   if(hp>1) draw->drawCircle(center,cellSize_*.22f,0,20,false,Color4F(.8f,.9f,1,1));
   continue;
  }
  const auto gem=board_.at(x,y); if(gem==Gem::Empty) continue;
  const auto gemIndex=static_cast<std::size_t>(static_cast<int>(gem)-1);
  draw->drawSolidCircle(center,cellSize_*.34f,0,28,colours[gemIndex]);
  if(selected_&&selected_->x==x&&selected_->y==y) draw->drawCircle(center,cellSize_*.39f,0,32,true,Color4F::WHITE);
 }
 draw->setTag(900); addChild(draw,1);
}
