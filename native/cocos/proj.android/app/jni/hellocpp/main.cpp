#include <memory>
#include <jni.h>
#include "AppDelegate.h"
namespace { std::unique_ptr<AppDelegate> appDelegate; }
void cocos_android_app_init(JNIEnv*) { appDelegate.reset(new AppDelegate()); }
