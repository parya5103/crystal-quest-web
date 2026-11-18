#include "CrystalCore.hpp"
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#define REQUIRE(x) do { if(!(x)) { std::cerr << "FAIL line " << __LINE__ << ": " #x "
"; return EXIT_FAILURE; } } while(0)
int main() {
 using namespace gogo::crystal;
 Board palette(3,3);
 palette.set(0,0,Gem::Amber); palette.set(1,0,Gem::Aqua);
 palette.set(2,0,Gem::Rose); palette.set(0,1,Gem::Verdant);
 palette.set(1,1,Gem::Violet); palette.set(2,1,Gem::Solar);
 REQUIRE(palette.at(2,1)==Gem::Solar);

 Board palette(3,3);
 palette.set(0,0,Gem::Amber); palette.set(1,0,Gem::Aqua);
 palette.set(2,0,Gem::Rose); palette.set(0,1,Gem::Verdant);
 palette.set(1,1,Gem::Violet); palette.set(2,1,Gem::Solar);
 REQUIRE(palette.at(2,1)==Gem::Solar);

 Board b(5,5);
 b.set(0,0,Gem::Red); b.set(1,0,Gem::Red); b.set(2,0,Gem::Red);
 REQUIRE(findMatches(b).size()==3);
 REQUIRE(clearMatches(b)==3);
 REQUIRE(findMatches(b).empty());

 Board cross(5,5);
 for(int x=1;x<=3;++x) cross.set(x,2,Gem::Blue);
 for(int y=1;y<=3;++y) cross.set(2,y,Gem::Blue);
 REQUIRE(findMatches(cross).size()==5);

 Board s(3,3);
 s.set(0,0,Gem::Blue); s.set(1,0,Gem::Green); s.set(2,0,Gem::Blue); s.set(1,1,Gem::Blue);
 REQUIRE(swapIfMatch(s,{1,0},{1,1}));
 REQUIRE(findMatches(s).size()==3);

 Board no(3,3);
 no.set(0,0,Gem::Blue); no.set(1,0,Gem::Green);
 REQUIRE(!swapIfMatch(no,{0,0},{1,0}));
 REQUIRE(no.at(0,0)==Gem::Blue&&no.at(1,0)==Gem::Green);
 REQUIRE(!swapIfMatch(no,{0,0},{2,0}));
 REQUIRE(!swapIfMatch(no,{-1,0},{0,0}));

 bool rejected=false;
 try { Board bad(100000,100000); } catch(const std::invalid_argument&) { rejected=true; }
 REQUIRE(rejected);
 Board malformed(3,3); malformed.cells.pop_back();
 rejected=false;
 try { (void)findMatches(malformed); } catch(const std::invalid_argument&) { rejected=true; }
 REQUIRE(rejected);

 Board cascadeA(5,5), cascadeB(5,5);
 for(int y=0;y<5;++y) for(int x=0;x<5;++x) {
  const auto gem=static_cast<Gem>(1+((x+2*y)%6));
  cascadeA.set(x,y,gem); cascadeB.set(x,y,gem);
 }
 cascadeA.set(0,0,Gem::Red); cascadeA.set(1,0,Gem::Red); cascadeA.set(2,0,Gem::Red);
 cascadeB.set(0,0,Gem::Red); cascadeB.set(1,0,Gem::Red); cascadeB.set(2,0,Gem::Red);
 const auto resolvedA=resolveCascades(cascadeA,123456u);
 const auto resolvedB=resolveCascades(cascadeB,123456u);
 REQUIRE(resolvedA.cleared>=3 && resolvedA.cascades>=1 && resolvedA.stable);
 REQUIRE(cascadeA.cells==cascadeB.cells);
 REQUIRE(resolvedA.cleared==resolvedB.cleared && resolvedA.cascades==resolvedB.cascades);
 return EXIT_SUCCESS;
}
