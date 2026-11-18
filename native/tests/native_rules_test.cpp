#include "CrystalCore.hpp"
#include <cassert>
int main(){
 using namespace gogo::crystal;
 Board b(5,5); b.set(0,0,Gem::Red);b.set(1,0,Gem::Red);b.set(2,0,Gem::Red);
 assert(findMatches(b).size()==3);assert(clearMatches(b)==3);assert(findMatches(b).empty());
 Board s(3,3);s.set(0,0,Gem::Blue);s.set(1,0,Gem::Green);s.set(2,0,Gem::Blue);s.set(1,1,Gem::Blue);
 assert(swapIfMatch(s,{1,0},{1,1}));assert(findMatches(s).size()==3);
 Board no(3,3);no.set(0,0,Gem::Blue);no.set(1,0,Gem::Green);
 assert(!swapIfMatch(no,{0,0},{1,0}));assert(no.at(0,0)==Gem::Blue&&no.at(1,0)==Gem::Green);
 return 0;
}
