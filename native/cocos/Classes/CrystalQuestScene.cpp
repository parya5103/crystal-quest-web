#include "CrystalQuestScene.h"
#include <array>
#include <algorithm>
#include <string>
USING_NS_CC;
using namespace gogo::crystal;
Scene* CrystalQuestScene::createScene() {
 auto scene=Scene::create(); auto layer=CrystalQuestScene::create();
 if(layer) scene->addChild(layer);
 return scene;
}
bool CrystalQuestScene::init() {
 if(!Layer::init()) return false;
 auto size=Director::getInstance()->getVisibleSize();
 auto origin=Director::getInstance()->getVisibleOrigin();
 auto title=Label::createWithSystemFont("CRYSTAL QUEST","Arial",34);
 title->setPosition(origin.x+size.width/2,origin.y+size.height-82); addChild(title);
 status_=Label::createWithSystemFont("Level 1 · Crystal Gate","Arial",19);
 status_->setPosition(origin.x+size.width/2,origin.y+size.height-128); addChild(status_);
 scoreLabel_=Label::createWithSystemFont("Score: 0 / 4200","Arial",20);
 scoreLabel_->setPosition(origin.x+size.width/2,origin.y+size.height-166); addChild(scoreLabel_);
 moves_=Label::createWithSystemFont("Moves: 13","Arial",22);
 moves_->setPosition(origin.x+size.width/2,origin.y+82); addChild(moves_);
 cellSize_=std::min((size.width-36)/8.0f,(size.height-290)/8.0f);
 boardOrigin_=Vec2(origin.x+(size.width-cellSize_*8)/2,origin.y+(size.height-cellSize_*8)/2-10);
 // Deterministic no-match starting board for the native vertical slice.
 for(int y=0;y<8;++y) for(int x=0;x<8;++x)
  board_.set(x,y,static_cast<Gem>(1+((x+2*y)%6)));
 redraw();
 auto listener=EventListenerTouchOneByOne::create();
 listener->onTouchBegan=CC_CALLBACK_2(CrystalQuestScene::onTouchBegan,this);
 _eventDispatcher->addEventListenerWithSceneGraphPriority(listener,this);
 return true;
}
bool CrystalQuestScene::pointToCell(const Vec2& point,Cell& out) const {
 const auto p=convertToNodeSpace(point)-boardOrigin_;
 if(p.x<0||p.y<0||p.x>=cellSize_*8||p.y>=cellSize_*8) return false;
 out={static_cast<int>(p.x/cellSize_),static_cast<int>(p.y/cellSize_)};
 return true;
}
bool CrystalQuestScene::onTouchBegan(Touch* touch,Event*) {
 if(finished_) return true;
 Cell cell{}; if(!pointToCell(touch->getLocation(),cell)) return false;
 if(!selected_) { selected_=cell; redraw(); return true; }
 const Cell first=*selected_; selected_.reset();
 if(adjacent(first,cell)&&swapIfMatch(board_,first,cell)) {
  const auto result=resolveCascades(board_,++turnSeed_);
  --movesLeft_;
  score_+=result.cleared*60+std::max(0,result.cascades-1)*120;
  moves_->setString("Moves: "+std::to_string(movesLeft_));
  scoreLabel_->setString("Score: "+std::to_string(score_)+" / "+std::to_string(scoreTarget_));
  if(score_>=scoreTarget_) {
   finished_=true;
   UserDefault::getInstance()->setIntegerForKey("crystalquest.native.unlocked",2);
   UserDefault::getInstance()->flush();
   setStatus("Level 1 complete! Native progress saved");
  } else if(movesLeft_<=0) {
   finished_=true;
   setStatus("Out of moves — restart the app to replay");
  } else setStatus("Cleared "+std::to_string(result.cleared)+" crystals · "+std::to_string(result.cascades)+" cascade(s)");
 } else setStatus("No match — choose an adjacent pair");
 redraw(); return true;
}
void CrystalQuestScene::setStatus(const std::string& value) { if(status_) status_->setString(value); }
void CrystalQuestScene::redraw() {
 removeChildByTag(900,true);
 auto draw=DrawNode::create();
 const std::array<Color4F,6> colours={Color4F(1.0f,.62f,.18f,1),Color4F(.18f,.85f,.95f,1),
  Color4F(.98f,.35f,.53f,1),Color4F(.25f,.82f,.48f,1),Color4F(.62f,.38f,.95f,1),Color4F(1.0f,.82f,.2f,1)};
 for(int y=0;y<8;++y) for(int x=0;x<8;++x) {
  const Vec2 center=boardOrigin_+Vec2((x+.5f)*cellSize_,(y+.5f)*cellSize_);
  draw->drawSolidRect(center-Vec2(cellSize_*.47f,cellSize_*.47f),center+Vec2(cellSize_*.47f,cellSize_*.47f),Color4F(.10f,.13f,.22f,1));
  const auto gem=board_.at(x,y); if(gem==Gem::Empty) continue;
  const auto index=static_cast<std::size_t>(static_cast<int>(gem)-1);
  draw->drawSolidCircle(center,cellSize_*.34f,0,28,colours[index]);
  if(selected_&&selected_->x==x&&selected_->y==y)
   draw->drawCircle(center,cellSize_*.39f,0,32,true,Color4F::WHITE);
 }
 draw->setTag(900); addChild(draw,1);
}
