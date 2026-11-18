#include "CrystalCore.hpp"
#include <cstdlib>
#include <iostream>
#include <stdexcept>
#define REQUIRE(x) do { if(!(x)) { std::cerr << "FAIL line " << __LINE__ << ": " #x "\n"; return EXIT_FAILURE; } } while(0)
int main() {
 using namespace gogo::crystal;
 Board palette(3,3);\n palette.set(0,0,Gem::Amber); palette.set(1,0,Gem::Aqua);\n palette.set(2,0,Gem::Rose); palette.set(0,1,Gem::Verdant);\n palette.set(1,1,Gem::Violet); palette.set(2,1,Gem::Solar);\n REQUIRE(palette.at(2,1)==Gem::Solar);\n\n Board b(5,5);
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
 return EXIT_SUCCESS;
}
