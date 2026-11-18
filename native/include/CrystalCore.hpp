#pragma once
#include <cstdint>
#include <vector>
#include <stdexcept>
#include <algorithm>
#include <cstdlib>
#include <cstddef>

namespace gogo::crystal {
enum class Gem : std::uint8_t { Empty, Red, Blue, Green, Yellow, Purple, Orange, Amber=Red, Aqua=Blue, Rose=Green, Verdant=Yellow, Violet=Purple, Solar=Orange };
struct Cell { int x; int y; };
struct Board {
 int width=0,height=0;
 std::vector<Gem> cells;
 std::vector<std::uint8_t> active,blockers,blockerHp;
 static std::size_t checkedSize(int w,int h) {
  if(w<3||h<3||w>20||h>20) throw std::invalid_argument("invalid board dimensions");
  return static_cast<std::size_t>(w)*static_cast<std::size_t>(h);
 }
 explicit Board(int w,int h,Gem fill=Gem::Empty)
  :width(w),height(h),cells(checkedSize(w,h),fill),active(cells.size(),1),blockers(cells.size(),0),blockerHp(cells.size(),0) {}
 bool valid() const {
  const auto n=static_cast<std::size_t>(width>0?width:0)*static_cast<std::size_t>(height>0?height:0);
  return width>=3&&height>=3&&width<=20&&height<=20&&cells.size()==n&&
   (active.empty()||active.size()==n)&&(blockers.empty()||blockers.size()==n)&&
   (blockerHp.empty()||blockerHp.size()==n);
 }
 std::size_t index(int x,int y) const {
  if(!valid()||x<0||y<0||x>=width||y>=height) throw std::out_of_range("cell");
  return static_cast<std::size_t>(y*width+x);
 }
 Gem at(int x,int y) const { return cells[index(x,y)]; }
 void set(int x,int y,Gem g) { cells[index(x,y)]=g; }
 bool isActive(std::size_t i) const { return active.empty()||active[i]!=0; }
 bool isBlocker(std::size_t i) const { return !blockers.empty()&&blockers[i]!=0; }
};

inline std::vector<Cell> findMatches(const Board& b) {
 if(!b.valid()) throw std::invalid_argument("invalid board storage");
 std::vector<bool> marked(b.cells.size(),false);
 for(int y=0;y<b.height;++y) for(int x=0;x<b.width;++x) {
  const auto i=static_cast<std::size_t>(y*b.width+x);
  const Gem g=b.cells[i];
  if(!b.isActive(i)||b.isBlocker(i)||g==Gem::Empty) continue;
  int end=x+1;
  while(end<b.width) {
   const auto j=static_cast<std::size_t>(y*b.width+end);
   if(!b.isActive(j)||b.isBlocker(j)||b.cells[j]!=g) break;
   ++end;
  }
  if(end-x>=3) for(int k=x;k<end;++k) marked[static_cast<std::size_t>(y*b.width+k)]=true;
  end=y+1;
  while(end<b.height) {
   const auto j=static_cast<std::size_t>(end*b.width+x);
   if(!b.isActive(j)||b.isBlocker(j)||b.cells[j]!=g) break;
   ++end;
  }
  if(end-y>=3) for(int k=y;k<end;++k) marked[static_cast<std::size_t>(k*b.width+x)]=true;
 }
 std::vector<Cell> out;
 for(int i=0;i<static_cast<int>(marked.size());++i)
  if(marked[static_cast<std::size_t>(i)]) out.push_back({i%b.width,i/b.width});
 return out;
}
inline bool adjacent(Cell a,Cell b) { return std::abs(a.x-b.x)+std::abs(a.y-b.y)==1; }
inline bool swapIfMatch(Board& b,Cell a,Cell c) {
 if(!b.valid()||!adjacent(a,c)||a.x<0||a.y<0||c.x<0||c.y<0||a.x>=b.width||c.x>=b.width||a.y>=b.height||c.y>=b.height) return false;
 const auto ia=static_cast<std::size_t>(a.y*b.width+a.x),ib=static_cast<std::size_t>(c.y*b.width+c.x);
 if(!b.isActive(ia)||!b.isActive(ib)||b.isBlocker(ia)||b.isBlocker(ib)||b.cells[ia]==Gem::Empty||b.cells[ib]==Gem::Empty) return false;
 std::swap(b.cells[ia],b.cells[ib]);
 if(findMatches(b).empty()) { std::swap(b.cells[ia],b.cells[ib]); return false; }
 return true;
}
inline int clearMatches(Board& b) {
 const auto matches=findMatches(b);
 std::vector<bool> hit(b.cells.size(),false);
 for(const auto& c:matches) {
  const auto i=static_cast<std::size_t>(c.y*b.width+c.x);
  b.cells[i]=Gem::Empty;
  const int dx[4]={0,1,0,-1},dy[4]={-1,0,1,0};
  for(int d=0;d<4;++d) {
   const int x=c.x+dx[d],y=c.y+dy[d];
   if(x<0||y<0||x>=b.width||y>=b.height) continue;
   const auto j=static_cast<std::size_t>(y*b.width+x);
   if(b.isActive(j)&&b.isBlocker(j)&&!hit[j]) {
    hit[j]=true;
    if(!b.blockerHp.empty()&&b.blockerHp[j]>0) {
     --b.blockerHp[j];
     if(b.blockerHp[j]==0) b.blockers[j]=0;
    }
   }
  }
 }
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
  result.cleared+=count; ++result.cascades;
  for(int x=0;x<b.width;++x) {
   int bottom=b.height-1;
   while(bottom>=0) {
    const auto bi=static_cast<std::size_t>(bottom*b.width+x);
    if(!b.isActive(bi)||b.isBlocker(bi)) { --bottom; continue; }
    int top=bottom;
    while(top>=0) {
     const auto ti=static_cast<std::size_t>(top*b.width+x);
     if(!b.isActive(ti)||b.isBlocker(ti)) break;
     --top;
    }
    int write=bottom;
    for(int read=bottom;read>top;--read) {
     const auto ri=static_cast<std::size_t>(read*b.width+x);
     if(b.cells[ri]!=Gem::Empty) {
      const auto wi=static_cast<std::size_t>(write*b.width+x);
      if(write!=read) { b.cells[wi]=b.cells[ri]; b.cells[ri]=Gem::Empty; }
      --write;
     }
    }
    while(write>top) {
     const auto wi=static_cast<std::size_t>(write*b.width+x);
     b.cells[wi]=static_cast<Gem>(1u+(next()%6u)); --write;
    }
    bottom=top;
   }
  }
 }
 result.stable=findMatches(b).empty();
 return result;
}
} // namespace gogo::crystal
