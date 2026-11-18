#include "AppDelegate.h"
#include "CrystalQuestScene.h"
USING_NS_CC;
void AppDelegate::initGLContextAttrs() {
 GLContextAttrs attrs = {8,8,8,8,24,8,0};
 GLView::setGLContextAttrs(attrs);
}
bool AppDelegate::applicationDidFinishLaunching() {
 auto director=Director::getInstance();
 auto view=director->getOpenGLView();
 if(!view) { view=GLViewImpl::create("Crystal Quest"); director->setOpenGLView(view); }
 director->setAnimationInterval(1.0/60.0);
 view->setDesignResolutionSize(540,960,ResolutionPolicy::SHOW_ALL);
 director->runWithScene(CrystalQuestScene::createScene());
 return true;
}
void AppDelegate::applicationDidEnterBackground() { Director::getInstance()->stopAnimation(); }
void AppDelegate::applicationWillEnterForeground() { Director::getInstance()->startAnimation(); }
