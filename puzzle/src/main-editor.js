/**
 * Birthday Puzzle Room - EDITOR VERSION
 * Same puzzle logic as main.js but with drag + scroll resize + export
 * Enter room → auto edit mode → drag items → export coords
 */

var layout = {
  carpet:    { x:49, y:78, w:284, h:228 },
  sofa:      { x:47, y:50, w:308, h:128 },
  table:     { x:49, y:67, w:222, h:55 },
  door:      { x:93, y:77, w:60,  h:126 },
  bookshelf: { x:85, y:42, w:70,  h:100 },
  photo1:    { x:17, y:47, w:71,  h:41 },
  drawer:    { x:85, y:64, w:70,  h:55 },
  balloon2:  { x:31, y:14, w:66,  h:56 },
  balloon1:  { x:57, y:12, w:57,  h:49 },
  cake:      { x:47, y:60, w:55,  h:50 },
  balloon4:  { x:85, y:12, w:63,  h:43 },
  calendar:  { x:70, y:29, w:72,  h:80 },
  lamp:      { x:13, y:64, w:35,  h:74 },
  balloon3:  { x:15, y:19, w:50,  h:50 },
  envelope:  { x:40, y:61, w:55,  h:40 },
  gift:      { x:24, y:77, w:48,  h:44 },
  balloon5:  { x:40, y:18, w:47,  h:41 },
  balloon6:  { x:73, y:16, w:34,  h:54 },
  plant:     { x:9,  y:88, w:32,  h:50 },
  note:      { x:83, y:57, w:36,  h:36 },
  vase:      { x:61, y:61, w:28,  h:42 },
  mug:       { x:55, y:62, w:24,  h:22 }
};

var balloonColors = {
  balloon1:{color:'#ef5350',letter:'X',label:'红色气球'},
  balloon2:{color:'#ffd54f',letter:'Z',label:'金色气球'},
  balloon3:{color:'#66bb6a',letter:'B',label:'绿色气球'},
  balloon4:{color:'#ab47bc',letter:null,label:'紫色气球'},
  balloon5:{color:'#ff7043',letter:null,label:'橙色气球'},
  balloon6:{color:'#ec407a',letter:null,label:'粉色气球'}
};

var objectLabels = {
  carpet:'地毯',sofa:'沙发',table:'桌子',door:'拱门',bookshelf:'书架',
  photo1:'照片板',drawer:'抽屉',cake:'蛋糕',calendar:'日历',lamp:'台灯',
  envelope:'信封',gift:'礼物盒',plant:'绿植',note:'纸条',vase:'花瓶',mug:'杯子',
  balloon1:'🔴红(X)',balloon2:'🟡黄(Z)',balloon3:'绿(B)',
  balloon4:'🟣紫',balloon5:'🟠橙',balloon6:'🩷粉'
};

function buildInner(id) {
  if(id==='balloon1') return '<div class="balloon-body" style="background:#ef5350"></div>';
  switch(id){
    case 'sofa':return '<div class="sofa-body"><div class="sofa-backrest"></div><div class="sofa-seat"></div><div class="sofa-arm l"></div><div class="sofa-arm r"></div><div class="cushion" style="top:18%;left:16%;width:13%;height:32%;background:#8d6e63"></div><div class="cushion" style="top:20%;left:32%;width:11%;height:28%;background:#a5d6a7"></div><div class="cushion" style="top:20%;right:32%;width:11%;height:28%;background:#90caf9"></div><div class="cushion" style="top:18%;right:16%;width:13%;height:32%;background:#ce93d8"></div><div class="teddy" style="top:12%;left:26%">🧸</div><div class="teddy" style="top:14%;right:24%;font-size:.9rem">🧸</div></div>';
    case 'table':return '<div class="table-body"><div class="table-leg" style="left:8%"></div><div class="table-leg" style="right:8%"></div><div class="table-leg" style="left:50%;transform:translateX(-50%)"></div></div>';
    case 'cake':return '<div class="cake-wrap"><div class="cake-flame" style="bottom:82%;left:25%"></div><div class="cake-candle" style="bottom:60%;left:26%"></div><div class="cake-flame" style="bottom:82%;left:48%"></div><div class="cake-candle" style="bottom:60%;left:49%"></div><div class="cake-flame" style="bottom:82%;left:70%"></div><div class="cake-candle" style="bottom:60%;left:71%"></div><div class="cake-frost"></div><div class="cake-body"></div></div>';
    case 'envelope':return '<div class="env-body"><div class="env-seal">💌</div></div>';
    case 'note':return '<div class="note-body">📝</div>';
    case 'mug':return '<div class="mug-body"></div>';
    case 'vase':return '<div class="vase-body"><div class="vase-fl">💐</div></div>';
    case 'calendar':return '<div class="cal-body"><div class="cal-top">09月</div><div class="cal-day">03</div></div>';
    case 'photo1':return '<div class="pb-body"><div class="pb-slot">📷</div><div class="pb-slot">📷</div><div class="pb-slot">📷</div><div class="pb-slot">📷</div></div>';
    case 'bookshelf':return '<div class="bs-body"><div class="bs-row"><div class="bs-book" style="height:70%;background:#ef5350"></div><div class="bs-book" style="height:85%;background:#42a5f5"></div><div class="bs-book" style="height:60%;background:#ffd54f"></div><div class="bs-book" style="height:90%;background:#66bb6a"></div></div><div class="bs-row"><div class="bs-book" style="height:80%;background:#ab47bc"></div><div class="bs-book" style="height:65%;background:#ff7043"></div><div class="bs-book" style="height:75%;background:#26c6da"></div></div><div class="bs-row"><div class="bs-book" style="height:70%;background:#ec407a"></div><div class="bs-book" style="height:85%;background:#8d6e63"></div><div class="bs-book" style="height:55%;background:#78909c"></div><div class="bs-book" style="height:78%;background:#ffa726"></div></div></div>';
    case 'door':return '<div class="door-body"><div class="door-knob"></div></div>';
    case 'lamp':return '<div class="lamp-body"><div class="lamp-shade"></div><div class="lamp-stand"></div><div class="lamp-base"></div></div>';
    case 'drawer':return '<div class="dr-body"><div class="dr-line" style="top:33%"></div><div class="dr-knob" style="top:28%"></div><div class="dr-line" style="top:66%"></div><div class="dr-knob" style="top:61%"></div></div>';
    case 'gift':return '<div class="gift-body"><div class="gift-rv"></div><div class="gift-rh"></div><div class="gift-bow">🎀</div></div>';
    case 'plant':return '<div class="plant-body"><div class="plant-leaves">🌿</div><div class="plant-pot"></div></div>';
    case 'carpet':return '<div class="carpet-body"></div>';
    default:
      if(id.indexOf('balloon')===0){var bc=balloonColors[id];return '<div class="balloon-body" style="background:'+(bc?bc.color:'#ccc')+'"></div>';}
      return '<span style="font-size:1.5rem">📦</span>';
  }
}

var sortedIds=Object.keys(layout).sort(function(a,b){return(layout[b].w*layout[b].h)-(layout[a].w*layout[a].h)});
var dragInfo=null;

function renderRoom(){
  var c=document.getElementById('objects');c.innerHTML='';
  sortedIds.forEach(function(id,idx){
    var p=layout[id];
    var el=document.createElement('div');
    el.className='obj';el.setAttribute('data-id',id);
    el.style.left=p.x+'%';el.style.top=p.y+'%';
    el.style.width=p.w+'px';el.style.height=p.h+'px';
    el.style.transform='translate(-50%,-50%)';
    el.style.zIndex=3+idx;
    el.dataset.baseZ=3+idx;
    el.style.cursor='grab';
    // Label always visible in editor
    var label=objectLabels[id]||id;
    el.innerHTML='<span class="tip" style="opacity:1;font-size:.6rem">'+label+'</span>'+buildInner(id);
    c.appendChild(el);
  });
  setupDrag();
}

function setupDrag(){
  var container=document.getElementById('objects');

  container.addEventListener('mousedown',function(e){
    var el=e.target.closest('.obj');
    if(!el||e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    el.style.zIndex=999;el.style.cursor='grabbing';
    var pr=container.parentElement.getBoundingClientRect();
    dragInfo={el:el,startMX:e.clientX,startMY:e.clientY,
      startL:parseFloat(el.style.left),startT:parseFloat(el.style.top),
      pW:pr.width,pH:pr.height};
  });

  document.addEventListener('mousemove',function(e){
    if(!dragInfo)return;e.preventDefault();
    var dx=e.clientX-dragInfo.startMX, dy=e.clientY-dragInfo.startMY;
    var nL=Math.max(1,Math.min(99,dragInfo.startL+(dx/dragInfo.pW)*100));
    var nT=Math.max(1,Math.min(99,dragInfo.startT+(dy/dragInfo.pH)*100));
    dragInfo.el.style.left=nL+'%';dragInfo.el.style.top=nT+'%';
  });

  document.addEventListener('mouseup',function(){
    if(dragInfo){dragInfo.el.style.zIndex=dragInfo.el.dataset.baseZ;dragInfo.el.style.cursor='grab';dragInfo=null;}
  });

  container.addEventListener('wheel',function(e){
    var el=e.target.closest('.obj');if(!el)return;
    e.preventDefault();e.stopPropagation();
    var d=e.deltaY>0?-8:8;
    el.style.width=Math.max(16,el.offsetWidth+d)+'px';
    el.style.height=Math.max(16,el.offsetHeight+d)+'px';
    var id=el.getAttribute('data-id');
    var tip=el.querySelector('.tip');
    el.innerHTML=(tip?tip.outerHTML:'')+buildInner(id);
  },{passive:false});
}

function exportLayout(){
  var lines=[];
  sortedIds.forEach(function(id){
    var el=document.querySelector('[data-id="'+id+'"]');if(!el)return;
    var r=el.getBoundingClientRect(),pr=el.parentElement.parentElement.getBoundingClientRect();
    var x=Math.round(((r.left+r.width/2-pr.left)/pr.width)*100);
    var y=Math.round(((r.top+r.height/2-pr.top)/pr.height)*100);
    lines.push('  '+id+': { x:'+x+', y:'+y+', w:'+Math.round(r.width)+', h:'+Math.round(r.height)+' }');
  });
  var out='var layout = {
  carpet:    { x:49, y:78, w:284, h:228 },
  sofa:      { x:47, y:50, w:308, h:128 },
  table:     { x:49, y:67, w:222, h:55 },
  door:      { x:93, y:77, w:60,  h:126 },
  bookshelf: { x:85, y:42, w:70,  h:100 },
  calendar:  { x:70, y:29, w:72,  h:80 },
  drawer:    { x:85, y:64, w:70,  h:55 },
  balloon2:  { x:32, y:17, w:66,  h:56 },
  photo1:    { x:17, y:47, w:71,  h:41 },
  balloon1:  { x:20, y:28, w:73,  h:65 },
  cake:      { x:47, y:60, w:55,  h:50 },
  balloon4:  { x:84, y:23, w:79,  h:59 },
  lamp:      { x:13, y:64, w:35,  h:74 },
  balloon3:  { x:49, y:21, w:66,  h:66 },
  envelope:  { x:40, y:61, w:55,  h:40 },
  gift:      { x:24, y:77, w:48,  h:44 },
  balloon5:  { x:62, y:18, w:47,  h:41 },
  balloon6:  { x:73, y:16, w:34,  h:54 },
  plant:     { x:9,  y:88, w:32,  h:50 },
  note:      { x:83, y:57, w:36,  h:36 },
  vase:      { x:61, y:61, w:28,  h:42 },
  mug:       { x:55, y:62, w:24,  h:22 }
};';
  navigator.clipboard.writeText(out).then(function(){alert('✅ 已复制！粘贴发给我。')}).catch(function(){prompt('复制：',out)});
  console.log(out);
}

// Auto-enter room and show editor UI
function enterRoom(){
  document.getElementById('landing').style.display='none';
  document.getElementById('room').style.display='block';
  renderRoom();

  var bar=document.createElement('div');
  bar.style.cssText='position:fixed;top:12px;right:12px;z-index:200;display:flex;gap:8px';
  bar.innerHTML='<button onclick="exportLayout()" style="padding:10px 20px;border:none;border-radius:6px;background:#4caf50;color:#fff;font-size:.85rem;cursor:pointer;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.15)">📋 导出坐标</button>';
  document.body.appendChild(bar);

  var hint=document.createElement('div');
  hint.style.cssText='position:fixed;top:52px;right:12px;z-index:200;background:rgba(0,0,0,.65);color:#fff;padding:8px 14px;border-radius:6px;font-size:.72rem;max-width:220px;line-height:1.6;backdrop-filter:blur(4px);transition:opacity 1s';
  hint.innerHTML='✏️ 编辑模式已开启<br>· 拖拽移动位置<br>· 滚轮调大小<br>· 完成后点「导出坐标」';
  document.body.appendChild(hint);
  setTimeout(function(){hint.style.opacity='0'},6000);
  setTimeout(function(){hint.remove()},7000);
}

// Landing emojis
(function(){var em=['🎈','💗','🎂','✨','🍃','💜',''],ld=document.getElementById('landing');
for(var i=0;i<12;i++){var el=document.createElement('div');el.className='float-emoji';el.textContent=em[Math.floor(Math.random()*em.length)];el.style.left=Math.random()*100+'%';el.style.animationDuration=(6+Math.random()*8)+'s';el.style.animationDelay=Math.random()*6+'s';el.style.fontSize=(1+Math.random()*1.2)+'rem';ld.appendChild(el)}})();

console.log('🔐 Birthday Room EDITOR loaded.');
