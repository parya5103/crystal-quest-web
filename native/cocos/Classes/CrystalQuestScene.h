#pragma once
#include "cocos2d.h"
#include "CrystalCore.hpp"
#include <optional>
class CrystalQuestScene final : public cocos2d::Layer {
public:
 static cocos2d::Scene* createScene();
 bool init() override;
 CREATE_FUNC(CrystalQuestScene);
private:
 bool onTouchBegan(cocos2d::Touch*,cocos2d::Event*);
 bool pointToCell(const cocos2d::Vec2&,gogo::crystal::Cell&) const;
 bool loadLevel(int level);
 void redraw();
 void setStatus(const std::string&);
 gogo::crystal::Board board_{8,8};
 int currentLevel_=1;
 bool levelComplete_=false;
 std::string levelName_;
 cocos2d::Vec2 boardOrigin_;
 float cellSize_=0;
 std::optional<gogo::crystal::Cell> selected_;
 cocos2d::Label* status_=nullptr;
 cocos2d::Label* moves_=nullptr;
 cocos2d::Label* scoreLabel_=nullptr;
 int movesLeft_=13;
 int score_=0;
 int scoreTarget_=4200;
 bool finished_=false;
 std::uint32_t turnSeed_=0xC0FFEEu;
};
