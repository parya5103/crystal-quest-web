#pragma once
#include <cstdint>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <cstdlib>
#include <cstddef>

namespace gogo::crystal {
// Preserve the original test-facing names while exposing the six campaign colours.
enum class Gem : std::uint8_t { Empty, Red, Blue, Green, Yellow, Purple, Orange, Amber=Red, Aqua=Blue, Rose=Green, Verdant=Yellow, Violet=Purple, Solar=Orange };
struct Cell { int x; int y; };

struct Board {
 int width=0,height=0;
 std::vector<Gem> cells;

 static std::size_t checkedSize(int w,int h) {
  if(w<3||h<3||w>20||h>20) throw std::invalid_argument("invalid board dimensions");
  return static_cast<std::size_t>(w)*static_cast<std::size_t>(h);
 }
 explicit Board(int w,int h,Gem fill=Gem::Empty)
  :width(w),height(h),cells(checkedSize(w,h),fill) {}

 bool valid() const {
  return width>=3&&height>=3&&width<=20&&height<=20&&
   cells.size()==static_cast<std::size_t>(width)*static_cast<std::size_t>(height);
 }
 Gem at(int x,int y) const {
  if(!valid()||x<0||y<0||x>=width||y>=height) throw std::out_of_range("cell");
  return cells[static_cast<std::size_t>(y*width+x)];
 }
 void set(int x,int y,Gem g) {
  if(!valid()||x<0||y<0||x>=width||y>=height) throw std::out_of_range("cell");
  cells[static_cast<std::size_t>(y*width+x)]=g;
 }
};

inline std::vector<Cell> findMatches(const Board& b) {
 if(!b.valid()) throw std::invalid_argument("invalid board storage");
 std::vector<bool> marked(b.cells.size(),false);
 for(int y=0;y<b.height;++y) for(int x=0;x<b.width;++x) {
  const Gem g=b.at(x,y);
  if(g==Gem::Empty) continue;
  int end=x+1;
  while(end<b.width&&b.at(end,y)==g) ++end;
  if(end-x>=3) for(int k=x;k<end;++k) marked[static_cast<std::size_t>(y*b.width+k)]=true;
  end=y+1;
  while(end<b.height&&b.at(x,end)==g) ++end;
  if(end-y>=3) for(int k=y;k<end;++k) marked[static_cast<std::size_t>(k*b.width+x)]=true;
 }
 std::vector<Cell> out;
 for(int i=0;i<static_cast<int>(marked.size());++i)
  if(marked[static_cast<std::size_t>(i)]) out.push_back({i%b.width,i/b.width});
 return out;
}
inline bool adjacent(Cell a,Cell b) {
 return std::abs(a.x-b.x)+std::abs(a.y-b.y)==1;
}
inline bool swapIfMatch(Board& b,Cell a,Cell c) {
 if(!b.valid()||!adjacent(a,c)||a.x<0||a.y<0||c.x<0||c.y<0||
    a.x>=b.width||c.x>=b.width||a.y>=b.height||c.y>=b.height) return false;
 const auto ia=static_cast<std::size_t>(a.y*b.width+a.x);
 const auto ib=static_cast<std::size_t>(c.y*b.width+c.x);
 std::swap(b.cells[ia],b.cells[ib]);
 if(findMatches(b).empty()) { std::swap(b.cells[ia],b.cells[ib]); return false; }
 return true;
}
inline int clearMatches(Board& b) {
 const auto matches=findMatches(b);
 for(const auto& c:matches) b.set(c.x,c.y,Gem::Empty);
 return static_cast<int>(matches.size());
}

struct CascadeResult { int cleared=0; int cascades=0; bool stable=true; };
inline CascadeResult resolveCascades(Board& b,std::uint32_t seed) {
 if(!b.valid()) throw std::invalid_argument("invalid board storage");
 CascadeResult result;
 if(seed==0) seed=0x9e3779b9u;
 auto next=[&seed]() { seed^=seed<<13; seed^=seed>>17; seed^=seed<<5; return seed; };
 for(int pass=0;pass<64;++pass) {
  const int count=clearMatches(b);
  if(count==0) return result;
  result.cleared+=count;
  ++result.cascades;
  for(int x=0;x<b.width;++x) {
   int write=b.height-1;
   for(int read=b.height-1;read>=0;--read) {
    const Gem gem=b.at(x,read);
    if(gem!=Gem::Empty) {
     if(write!=read) { b.set(x,write,gem); b.set(x,read,Gem::Empty); }
     --write;
    }
   }
   while(write>=0) {
    const auto colour=static_cast<std::uint8_t>(1u+(next()%6u));
    b.set(x,write,static_cast<Gem>(colour));
    --write;
   }
  }
 }
 result.stable=findMatches(b).empty();
 return result;
}
} // namespace gogo::crystal
