#pragma once
#include <cstdint>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <cstdlib>
namespace gogo::crystal {
enum class Gem : std::uint8_t { Empty, Red, Blue, Green, Yellow, Purple };
struct Cell { int x; int y; };
struct Board {
 int width=0,height=0; std::vector<Gem> cells;
 explicit Board(int w,int h,Gem fill=Gem::Empty):width(w),height(h),cells(static_cast<std::size_t>(w*h),fill) {
  if(w<3||h<3||w>20||h>20) throw std::invalid_argument("invalid board dimensions");
 }
 Gem at(int x,int y) const { if(x<0||y<0||x>=width||y>=height) throw std::out_of_range("cell"); return cells[static_cast<std::size_t>(y*width+x)]; }
 void set(int x,int y,Gem g) { if(x<0||y<0||x>=width||y>=height) throw std::out_of_range("cell"); cells[static_cast<std::size_t>(y*width+x)]=g; }
};
inline std::vector<Cell> findMatches(const Board& b) {
 std::vector<bool> marked(b.cells.size(),false);
 for(int y=0;y<b.height;++y) for(int x=0;x<b.width;++x) {
  const Gem g=b.at(x,y); if(g==Gem::Empty) continue;
  int end=x+1; while(end<b.width&&b.at(end,y)==g) ++end;
  if(end-x>=3) for(int k=x;k<end;++k) marked[static_cast<std::size_t>(y*b.width+k)]=true;
  end=y+1; while(end<b.height&&b.at(x,end)==g) ++end;
  if(end-y>=3) for(int k=y;k<end;++k) marked[static_cast<std::size_t>(k*b.width+x)]=true;
 }
 std::vector<Cell> out;
 for(int i=0;i<static_cast<int>(marked.size());++i) if(marked[static_cast<std::size_t>(i)]) out.push_back({i%b.width,i/b.width});
 return out;
}
inline bool adjacent(Cell a,Cell b) { return std::abs(a.x-b.x)+std::abs(a.y-b.y)==1; }
inline bool swapIfMatch(Board& b,Cell a,Cell c) {
 if(!adjacent(a,c)||a.x<0||a.y<0||c.x<0||c.y<0||a.x>=b.width||c.x>=b.width||a.y>=b.height||c.y>=b.height) return false;
 auto ia=static_cast<std::size_t>(a.y*b.width+a.x),ib=static_cast<std::size_t>(c.y*b.width+c.x);
 std::swap(b.cells[ia],b.cells[ib]); if(findMatches(b).empty()){std::swap(b.cells[ia],b.cells[ib]);return false;} return true;
}
inline int clearMatches(Board& b) { auto matches=findMatches(b); for(const auto& c:matches)b.set(c.x,c.y,Gem::Empty); return static_cast<int>(matches.size()); }
}
