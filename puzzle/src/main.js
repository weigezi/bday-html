
// Inject success bounce animation
(function(){
  var s = document.createElement('style');
  s.textContent = '@keyframes successBounce{0%{transform:scale(.8);opacity:0}50%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}';
  document.head.appendChild(s);
})();

/**
 * Birthday Puzzle Room - PRODUCTION v6
 * Complete puzzle logic implemented per user design
 * 
 * PUZZLE FLOW:
 * 1. Photo board (photo1) → Q: 房间号? A: 607 → get key → hint: open drawer
 * 2. Drawer (locked) → use key → get green note "B"
 * 3. Bookshelf (photo2) → Q: 哪天? A: 20240414 → get pin → hint: pop a balloon
 * 4. Red balloon → pop with pin → get red note "X"
 * 5. Window area (envelope3) → Q: 最长多少天没见面? A: 14 → letter opens → yellow "Z"
 * 6. Balloons left→right: red(X) yellow(Z) green(B) → password: XZB
 * 7. Door → enter XZB → finale!
 */

var layout = {
  carpet:    { x:49, y:78, w:284, h:228 },
  sofa:      { x:47, y:50, w:308, h:128 },
  table:     { x:49, y:67, w:222, h:55 },
  door:      { x:93, y:77, w:60,  h:126 },
  bookshelf: { x:85, y:42, w:70,  h:100 },
  photo1:    { x:17, y:45, w:100, h:72 },
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

// ═══ GAME STATE ═══
var game = {
  hasKey: false,        // from photo1 quiz
  drawerOpen: false,    // opened with key
  hasGreenNote: false,  // "B" from drawer
  hasPin: false,        // from photo2 quiz
  redBalloonPopped: false, // popped with pin
  hasRedNote: false,    // "X" from red balloon
  envelopeAnswered: false, // answered 14
  hasYellowNote: false, // "Z" from envelope letter
  doorUnlocked: false,
  cluesFound: [],
  hintsUsed: 0
};

// Balloon color mapping: balloon1=red(X), balloon2=yellow/gold(Z), balloon3=green(B)
// User will adjust positions; the COLOR determines the letter
var balloonColors = {
  balloon1: { color:'#ef5350', letter:'X', label:'红色气球' },
  balloon2: { color:'#ffd54f', letter:'Z', label:'金色气球' },
  balloon3: { color:'#66bb6a', letter:'B', label:'绿色气球' },
  balloon4: { color:'#ab47bc', letter:null, label:'紫色气球' },
  balloon5: { color:'#ff7043', letter:null, label:'橙色气球' },
  balloon6: { color:'#ec407a', letter:null, label:'粉色气球' }
};

var FINAL_PASSWORD = 'XZB';

// ═══ PUZZLE PHOTOS (change these to match your photos) ═══
// photo1 = 北京朝阳家合照, photo2 = 第一次吃饭, photo3 = 信封关联照片
var PUZZLE_PHOTOS = {
  photo1: './assets/北京朝阳家的照片.jpg',
  photo2: './assets/第一次吃饭照片.jpg',
  envelope: null  // 信封不显示照片
};

// ═══ OBJECT INTERACTION DATA ═══
function getObjectData(id) {
  switch(id) {
    // ── Photo board: Quiz 1 ──
    case 'photo1': return {
      emoji:'📷', title:'照片板',
      photo: PUZZLE_PHOTOS.photo1,
      text: game.hasKey ? '你已经拿到了钥匙 🔑 去试试打开抽屉吧！' :
        '这是在哪？\n\n问题：房间号是多少？\n（提示：3位数字）',
      type: game.hasKey ? 'flavor' : 'quiz',
      quizAnswer: '607',
      quizSuccess: function() {
        game.hasKey = true;
        game.cluesFound.push('key');
        return '✅ 正确！你获得了一把钥匙 🔑\n提示：去试试打开抽屉吧！';
      },
      quizFail: '不对哦，再想想？你们住的那个房间号...'
    };

    // ── Drawer: locked → key → auto-collect green "B" ──
    case 'drawer': return {
      emoji:'🗄️', title: game.drawerOpen ? '打开的抽屉' : '锁着的抽屉',
      text: game.drawerOpen ?
        '抽屉里的小纸条你已经拿走了。\n上面写着一个绿色的字母 "B" 💚' :
        (!game.hasKey ? '抽屉上有一把锁 🔒\n你需要先找到钥匙才能打开。\n提示：照片板上也许有线索？' :
          '你有钥匙了！要打开抽屉吗？'),
      type: game.drawerOpen ? 'flavor' :
            (!game.hasKey ? 'flavor' : 'unlock_drawer')
    };

    // ── Bookshelf: Quiz 2 (photo2 hidden inside) ──
    case 'bookshelf': return {
      emoji:'📚', title:'书架',
      photo: PUZZLE_PHOTOS.photo2,
      text: game.hasPin ? '你已经拿到了小扎针 📌 去扎破一个气球试试吧！' :
        '书架的书后面藏着一张照片...\n\n这是什么时候吃的饭？\n（提示：8位数字，格式 YYYYMMDD）',
      type: game.hasPin ? 'flavor' : 'quiz',
      quizAnswer: '20240414',
      quizSuccess: function() {
        game.hasPin = true;
        game.cluesFound.push('pin');
        return '✅ 正确！2024年4月14日，那顿难忘的饭！\n你获得了一根小扎针 📌\n提示：去扎破一个气球看看里面有什么？';
      },
      quizFail: '不对哦，想想我们第一次一起吃饭是什么时候？'
    };

    // ── Red balloon (balloon1): pop with pin → auto-collect red "X" ──
    case 'balloon1': return {
      emoji: game.redBalloonPopped ? '💥' : '🎈',
      title: game.redBalloonPopped ? '破了的红色气球' : '红色气球',
      text: game.redBalloonPopped ?
        '红色气球里的纸条你已经拿走了。\n上面写着一个红色的字母 "X" ❤️' :
        (!game.hasPin ? '红色的气球在轻轻晃动。\n好像里面藏着什么东西...\n但你没有工具弄破它。' :
          '要用扎针扎破这个红色气球吗？'),
      type: game.redBalloonPopped ? 'flavor' :
            (!game.hasPin ? 'flavor' : 'pop_balloon')
    };

    // ── Envelope: Quiz 3 → auto-collect Z + show letter ──
    case 'envelope': return {
      emoji:'💌', title: game.envelopeAnswered ? '已打开的信件' : '火漆信件',
      photo: null,
      text: game.envelopeAnswered ? LETTER_TEXT :
        '信封上有一个问题：\n\n我们最长多少天没见面？\n（提示：想想是什么时候？）',
      type: game.envelopeAnswered ? 'letter' : 'quiz',
      quizAnswer: '14',
      quizSuccess: function() {
        game.envelopeAnswered = true;
        game.hasYellowNote = true;
        game.cluesFound.push('envelope_opened');
        game.cluesFound.push('yellow_Z');
        updateSubtitleProgress();
        return '__SHOW_LETTER__';
      },
      quizFail: '不对哦，想想我们最久多久没见面？'
    };

    // ── Door: final password ──
    case 'door': return {
      emoji:'🚪', title: game.doorUnlocked ? '打开的门 ✨' : '紫色拱门',
      text: game.doorUnlocked ? '门已经打开了！生日快乐，小宝 Doris！🎂' :
        (game.hasRedNote && game.hasGreenNote && game.hasYellowNote ?
          '你收集到了三个字母！\n红色、黄色、绿色气球从左到右的顺序就是密码顺序。\n\n输入三位字母密码打开这扇门：' :
          '门上有金色的锁 🔒\n你需要收集所有线索后才能打开。'),
      type: game.doorUnlocked ? 'flavor' :
            (game.hasRedNote && game.hasGreenNote && game.hasYellowNote ? 'final_lock' : 'flavor')
    };

    // ── Other balloons (no puzzle content, just flavor) ──
    case 'balloon2': return { emoji:'🎈', title:'金色气球', text:'金色的气球在轻轻晃动。\n' + (game.hasYellowNote ? '你想起了那个黄色的字母 "Z" 💛' : '里面好像没有东西。'), type:'flavor' };
    case 'balloon3': return { emoji:'🎈', title:'绿色气球', text:'绿色的气球在轻轻晃动。\n' + (game.hasGreenNote ? '你想起了那个绿色的字母 "B" 💚' : '里面好像没有东西。'), type:'flavor' };
    case 'balloon4': return { emoji:'🎈', title:'紫色气球', text:'紫色的气球，Doris 最喜欢的颜色？', type:'flavor' };
    case 'balloon5': return { emoji:'🎈', title:'橙色气球', text:'温暖的橙色，像秋天的阳光。', type:'flavor' };
    case 'balloon6': return { emoji:'🎈', title:'粉色气球', text:'粉色的气球在天花板附近飘着。', type:'flavor' };

    // ── Flavor objects ──
    case 'cake': return { emoji:'🎂', title:'生日蛋糕', text:'粉色的蛋糕上插着蜡烛，今天的主角！🎂', type:'flavor' };
    case 'sofa': return { emoji:'🛋️', title:'沙发', text:'柔软的沙发上放着彩色抱枕和泰迪熊。', type:'flavor' };
    case 'table': return { emoji:'🪑', title:'桌子', text:'圆木桌上摆着蛋糕和杯子。', type:'flavor' };
    case 'mug': return { emoji:'☕', title:'蓝色马克杯', text:'杯子里还有半杯温热的可可。', type:'flavor' };
    case 'vase': return { emoji:'💐', title:'花瓶', text:'花瓶里夹着一张小卡片：\n"先看照片，再找线索。"', type:'hint' };
    case 'calendar': return { emoji:'📅', title:'日历', text:'九月三日，是属于小宝 Doris 的日子。\n1998年的这一天，世界上多了一个可爱的你。', type:'flavor' };
    case 'lamp': return { emoji:'💡', title:'台灯', text:'暖黄色的灯光柔和地亮着。', type:'flavor' };
    case 'plant': return { emoji:'🌿', title:'绿植', text:'龟背竹的叶子又大又绿。', type:'flavor' };
    case 'carpet': return { emoji:'🟢', title:'地毯', text:'掀开一角只有彩带，不是主线线索 🎀', type:'flavor' };
    case 'gift': return { emoji:'🎁', title:'礼物盒', text:'绿色的礼物盒系着金色丝带。\n等解开所有谜题后再来打开我吧！', type:'flavor' };
    case 'note': return { emoji:'📝', title:'小纸条', text: getHintText(), type:'hint' };

    default: return { emoji:'📦', title:id, text:'...', type:'flavor' };
  }
}

var LETTER_TEXT = '亲爱的宝贝见字如面！\n\n现在是你在英国游玩的一天，今天你到了爱丁堡，我很想你。很抱歉，这么久之后才又一次给你写信，更新我们的照片本。但是里面的照片我都会精心挑选，会给你最好的记忆，一直保留到我们老的那一天。\n\n看了一下上次打印的照片，最后是到25年的5月，我们在越南玩的时候。在那之后，我们一起又去了很多很多的地方，也在上海过了很多独一无二、平淡又美好的日子。\n\n我们有吵架到凌晨两三点、你哭得不能自已的夜晚，也有每天嘻嘻哈哈、叽叽喳喳的宝语腻歪环节，我清楚地知道，我一天比一天更喜欢你，更了解你，更离不开你了。\n\n别人说好的恋爱会让人重新找回童年，在你身边，我好像也重新变成了一个小孩，任性地表达着自己的情绪，不用有任何顾虑，卸下所有伪装跟你交流发癫。每次我发癫的时候，你都会很兴奋地拿起手机记录，让我很确定，无论我怎么傻傻地表演，也会有最亲爱的你捧场，发自内心地喜欢我。\n\n谢谢你带给我的这些安全感和被偏爱的信心。\n\n我们俩在这一年都变得更好了，更会爱对方了。在以后的日子里，我会一直对你超级超级好，让你做我最宝的宝，爱护你，记录你，鼓励你，一直到你有一天老了，回想起来也很清楚记得，你老公这么多年间对你的爱从来没有间断过！\n\n— Jerry';

function getProgress() {
  var parts = [];
  parts.push(game.hasKey ? '✅ 钥匙' : '❓ 钥匙');
  parts.push(game.hasGreenNote ? '✅ 绿色字母' : '❓ 绿色字母');
  parts.push(game.hasPin ? '✅ 扎针' : '❓ 扎针');
  parts.push(game.hasRedNote ? '✅ 红色字母' : '❓ 红色字母');
  parts.push(game.hasYellowNote ? '✅ 黄色字母' : '❓ 黄色字母');
  return parts.join(' | ');
}

function getHintText() {
  if (game.hintsUsed === 0) return '💡 提示卡（第1级）\n\n试试点击照片板看看？';
  if (game.hintsUsed === 1) return '💡 提示卡（第2级）\n\n书架后面好像藏着什么...\n红色气球里也许有东西？';
  if (game.hintsUsed === 2) return '💡 提示卡（第3级）\n\n信封上的问题答案是14。\n三个字母按气球颜色从左到右排列。';
  return '💡 最终提示\n\n密码是 XZB（红→黄→绿的字母顺序）';
}

// ═══ BUILD INNER HTML ═══
function buildInner(id) {
  // Popped balloon looks different
  if (id === 'balloon1' && game.redBalloonPopped) {
    return '<span style="font-size:1.5rem;opacity:.4">💥</span>';
  }
  switch(id) {
    case 'sofa': return '<div class="sofa-body"><div class="sofa-backrest"></div><div class="sofa-seat"></div><div class="sofa-arm l"></div><div class="sofa-arm r"></div><div class="cushion" style="top:18%;left:16%;width:13%;height:32%;background:#8d6e63"></div><div class="cushion" style="top:20%;left:32%;width:11%;height:28%;background:#a5d6a7"></div><div class="cushion" style="top:20%;right:32%;width:11%;height:28%;background:#90caf9"></div><div class="cushion" style="top:18%;right:16%;width:13%;height:32%;background:#ce93d8"></div><div class="teddy" style="top:12%;left:26%">🧸</div><div class="teddy" style="top:14%;right:24%;font-size:.9rem">🧸</div></div>';
    case 'table': return '<div class="table-body"><div class="table-leg" style="left:8%"></div><div class="table-leg" style="right:8%"></div><div class="table-leg" style="left:50%;transform:translateX(-50%)"></div></div>';
    case 'cake': return '<div class="cake-wrap"><div class="cake-flame" style="bottom:82%;left:25%"></div><div class="cake-candle" style="bottom:60%;left:26%"></div><div class="cake-flame" style="bottom:82%;left:48%"></div><div class="cake-candle" style="bottom:60%;left:49%"></div><div class="cake-flame" style="bottom:82%;left:70%"></div><div class="cake-candle" style="bottom:60%;left:71%"></div><div class="cake-frost"></div><div class="cake-body"></div></div>';
    case 'envelope': return '<div class="env-body"><div class="env-seal">'+(game.envelopeAnswered?'📖':'💌')+'</div></div>';
    case 'note': return '<div class="note-body">📝</div>';
    case 'mug': return '<div class="mug-body"></div>';
    case 'vase': return '<div class="vase-body"><div class="vase-fl">💐</div></div>';
    case 'calendar': return '<div class="cal-body"><div class="cal-top">09月</div><div class="cal-day">03</div></div>';
    case 'photo1':return '<div class="room-photo-frame"><div class="room-photo-pin"></div><div class="room-photo-inner"><div class="room-photo-scene"><div class="pf-sun"></div><div class="pf-heart">❤️</div><div class="pf-tree l"><div class="pf-crown"></div><div class="pf-trunk"></div></div><div class="pf-house"><div class="pf-roof"></div><div class="pf-wall"><div class="pf-win l"></div><div class="pf-win r"></div><div class="pf-door"></div></div></div><div class="pf-tree r"><div class="pf-crown"></div><div class="pf-trunk"></div></div></div></div></div>';
    case 'bookshelf': return '<div class="bs-body"><div class="bs-row"><div class="bs-book" style="height:70%;background:#ef5350"></div><div class="bs-book" style="height:85%;background:#42a5f5"></div><div class="bs-book" style="height:60%;background:#ffd54f"></div><div class="bs-book" style="height:90%;background:#66bb6a"></div></div><div class="bs-row"><div class="bs-book" style="height:80%;background:#ab47bc"></div><div class="bs-book" style="height:65%;background:#ff7043"></div><div class="bs-book" style="height:75%;background:#26c6da"></div></div><div class="bs-row"><div class="bs-book" style="height:70%;background:#ec407a"></div><div class="bs-book" style="height:85%;background:#8d6e63"></div><div class="bs-book" style="height:55%;background:#78909c"></div><div class="bs-book" style="height:78%;background:#ffa726"></div></div></div>';
    case 'door': return '<div class="door-body"><div class="door-knob"></div></div>';
    case 'lamp': return '<div class="lamp-body"><div class="lamp-shade"></div><div class="lamp-stand"></div><div class="lamp-base"></div></div>';
    case 'drawer': return '<div class="dr-body"><div class="dr-line" style="top:33%"></div><div class="dr-knob" style="top:28%"></div><div class="dr-line" style="top:66%"></div><div class="dr-knob" style="top:61%"></div>'+(game.drawerOpen?'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:.8rem">📄</div>':'')+'</div>';
    case 'gift': return '<div class="gift-body"><div class="gift-rv"></div><div class="gift-rh"></div><div class="gift-bow">🎀</div></div>';
    case 'plant': return '<div class="plant-body"><div class="plant-leaves">🌿</div><div class="plant-pot"></div></div>';
    case 'carpet': return '<div class="carpet-body"></div>';
    default:
      if(id.indexOf('balloon')===0){
        var bc=balloonColors[id];
        var col=bc?bc.color:'#ef5350';
        if(id==='balloon1'&&game.redBalloonPopped) return '<span style="font-size:1.2rem;opacity:.3">💥</span>';
        return '<div class="balloon-body" style="background:'+col+';animation-delay:'+(Math.random()*2)+'s"></div>';
      }
      return '<span style="font-size:1.5rem">📦</span>';
  }
}

// ═══ RENDER ═══
var sortedIds=Object.keys(layout).sort(function(a,b){return(layout[b].w*layout[b].h)-(layout[a].w*layout[a].h)});

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
    // Ensure small items on table render above table
    if(['cake','envelope','mug','vase'].indexOf(id)>=0) el.style.zIndex=3+sortedIds.length+5;
    el.innerHTML=buildInner(id);
    // Interactive object indicators
    var interactiveIds=['photo1','bookshelf','envelope','drawer','balloon1','door','note'];
    if(interactiveIds.indexOf(id)>=0){
      el.classList.add('interactive');
    }
    c.appendChild(el);
    el.addEventListener('click',function(e){
      e.stopPropagation();
      handleObjectClick(id);
    });
  });
}

// ═══ INTERACTION HANDLER ═══
function handleObjectClick(id) {
  var data = getObjectData(id);
  if (!data) return;

  // Handle collect actions first
  if (data.collectAction) {
    var result = data.collectAction();
    if (result) {
      showModal({ emoji:data.emoji, title:data.title, text:result, type:'flavor' }, id);
      // Re-render to update visuals
      setTimeout(function(){ renderRoom(); updateSubtitleProgress(); }, 100);
      return;
    }
  }

  // Handle quiz
  if (data.type === 'quiz') {
    showQuizModal(data);
    return;
  }

  // Handle unlock drawer
  if (data.type === 'unlock_drawer') {
    showModal({
      emoji:'🗄️', title:'打开抽屉',
      text:'用钥匙打开抽屉？',
      type:'confirm',
      confirmAction: function() {
        game.drawerOpen = true;
        game.hasGreenNote = true;
        game.cluesFound.push('green_B');
        closeModal();
        renderRoom();
        updateSubtitleProgress();
        setTimeout(function(){
          showModal({
            emoji:'💚', title:'绿色纸条',
            text:'抽屉打开了！里面有一张绿色小纸条，上面写着字母 "B"\n这是密码的其中一位！',
            type:'flavor'
          }, 'drawer');
        }, 300);
      }
    });
    return;
  }

  // Handle pop balloon
  if (data.type === 'pop_balloon') {
    showModal({
      emoji:'🎈', title:'扎破气球',
      text:'用扎针扎破这个红色气球？',
      type:'confirm',
      confirmAction: function() {
        game.redBalloonPopped = true;
        game.hasRedNote = true;
        game.cluesFound.push('red_X');
        closeModal();
        renderRoom();
        updateSubtitleProgress();
        setTimeout(function(){
          showModal({
            emoji:'❤️', title:'红色纸条',
            text:'气球破了！里面飘出一张红色小纸条，上面写着字母 "X"\n这是密码的其中一位！',
            type:'flavor'
          }, 'balloon1');
        }, 300);
      }
    });
    return;
  }

  // Handle final lock
  if (data.type === 'final_lock') {
    showFinalLockModal();
    return;
  }

  // Handle hint note
  if (data.type === 'hint' && id === 'note') {
    game.hintsUsed++;
    showModal(data, id);
    return;
  }

  // Default: show modal
  showModal(data, id);
}

// ═══ MODALS ═══
function showModal(d, currentId) {
  document.getElementById('modal-emoji').textContent = d.emoji||'';
  document.getElementById('modal-title').textContent = d.title||'';
  var photoHtml = '';
  if (d.photo) {
    photoHtml = '<div style="margin:12px auto;max-width:280px;border-radius:8px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1)"><img src="' + d.photo + '" style="width:100%;display:block;border-radius:8px" alt="photo"/></div>';
  }
  document.getElementById('modal-text').innerHTML = photoHtml + '<p style="white-space:pre-line">' + (d.text||'').replace(/\n/g,'<br>') + '</p>';
  var ex = document.getElementById('modal-extra'); ex.innerHTML = '';

  if (d.type === 'confirm' && d.confirmAction) {
    ex.innerHTML = '<button class="action-btn" id="confirm-btn">确认</button>';
    document.getElementById('confirm-btn').onclick = d.confirmAction;
  }
  if (d.type === 'letter' || (d.type === 'collect' && game.envelopeAnswered && currentId === 'envelope')) {
    // Show full letter
  }

  document.getElementById('modal-overlay').classList.add('show');
}

function showQuizModal(data) {
  document.getElementById('modal-emoji').textContent = data.emoji;
  document.getElementById('modal-title').textContent = data.title;
  // Polaroid-style photo frame
  var photoHtml = '';
  if (data.photo) {
      photoHtml = '<div class="quiz-photo-frame">' +
        '<div class="quiz-photo-tape"></div>' +
        '<div class="quiz-photo-inner"><img src="' + data.photo + '" class="quiz-photo-img" alt="puzzle photo"/></div>' +
        '<div class="quiz-photo-caption">memories ♡</div></div>';
  }
  document.getElementById('modal-text').innerHTML = photoHtml + '<p style="white-space:pre-line;margin-top:8px">' + (data.text||'').replace(/\n/g,'<br>') + '</p>';
  var ex = document.getElementById('modal-extra');
  ex.innerHTML = '<style>#quiz-input:focus{border-color:#e91e63!important}</style><input type="text" id="quiz-input" placeholder="输入答案" style="width:100%;padding:12px 16px;border:2px solid #f8bbd0;border-radius:12px;font-size:1.05rem;text-align:center;margin-bottom:12px;outline:none;transition:border-color .2s"/>' +
    '<br><button class="action-btn" id="quiz-submit" style="padding:12px 36px;font-size:.95rem;border-radius:999px">提交</button>' +
    '<p id="quiz-feedback" style="margin-top:10px;font-size:.82rem;min-height:1.2em"></p>';
  document.getElementById('modal-overlay').classList.add('show');
  setTimeout(function(){ var inp=document.getElementById('quiz-input'); if(inp) inp.focus(); }, 300);

  document.getElementById('quiz-submit').onclick = function() {
    var val = document.getElementById('quiz-input').value.trim();
    var fb = document.getElementById('quiz-feedback');
    if (val === data.quizAnswer) {
      var msg = data.quizSuccess();
      fb.style.color = '#43a047';
      if (msg !== '__SHOW_LETTER__') {
        fb.innerHTML = msg.replace(/\n/g,'<br>');
      } else {
        fb.innerHTML = '✅ 正确！是那14天的思念...<br>信封打开了 💌';
      }
      fb.style.animation = 'successBounce .5s ease-out';
      document.getElementById('quiz-input').disabled = true;
      document.getElementById('quiz-submit').disabled = true;
      document.getElementById('quiz-submit').style.opacity = '.5';
      // Small celebration confetti
      if (typeof confetti === 'function') {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.65 }, colors: ['#ffd700','#ff6b6b','#4ecdc4'], gravity: 0.8, ticks: 150 });
      }
      updateSubtitleProgress();
      // Envelope special: auto-show letter after answering
      if (msg === '__SHOW_LETTER__') {
        setTimeout(function(){
          closeModal();
          renderRoom();
          setTimeout(function(){
            // Build letter with handwriting style
            var lines = LETTER_TEXT.split('\n');
            var letterHtml = '<div class="letter-content">';
            for (var li = 0; li < lines.length; li++) {
              var lineText = lines[li].trim();
              if (lineText === '') { letterHtml += '<br>'; }
              else if (lineText.indexOf('— Jerry') === 0) {
                letterHtml += '<div class="letter-signature letter-line" style="animation-delay:' + (li * 0.15) + 's">' + lineText + '</div>';
              } else {
                letterHtml += '<div class="letter-line" style="animation-delay:' + (li * 0.15) + 's">' + lineText + '</div>';
              }
            }
            letterHtml += '</div>';
            showModal({
              emoji: '💌',
              title: 'Jerry 写给你的信',
              text: '',
              type: 'letter'
            }, 'envelope');
            document.getElementById('modal-text').innerHTML = letterHtml;
          }, 400);
        }, 1800);
      } else {
        setTimeout(function(){ closeModal(); renderRoom(); }, 2500);
      }
    } else {
      fb.style.color = '#e53935';
      fb.textContent = data.quizFail;
      document.getElementById('quiz-input').style.borderColor = '#e53935';
      setTimeout(function(){ document.getElementById('quiz-input').style.borderColor = '#f8bbd0'; }, 800);
    }
  };
  document.getElementById('quiz-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('quiz-submit').click();
  });
}

function showFinalLockModal() {
  document.getElementById('modal-emoji').textContent = '🚪';
  document.getElementById('modal-title').textContent = '输入密码';
  document.getElementById('modal-text').textContent = '三个字母按气球从左到右的颜色顺序排列：\n🔴红色 → 🟡黄色 → 绿色';
  var ex = document.getElementById('modal-extra');
  ex.innerHTML = '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">' +
    '<span style="display:inline-block;width:20px;height:20px;background:#ef5350;border-radius:50%"></span>' +
    '<span style="color:#999">→</span>' +
    '<span style="display:inline-block;width:20px;height:20px;background:#ffd54f;border-radius:50%"></span>' +
    '<span style="color:#999">→</span>' +
    '<span style="display:inline-block;width:20px;height:20px;background:#66bb6a;border-radius:50%"></span>' +
    '</div>' +
    '<input type="text" id="final-input" maxlength="3" placeholder="三位字母" style="width:100%;padding:10px;border:2px solid #7e57c2;border-radius:8px;font-size:1.2rem;text-align:center;letter-spacing:.3em;font-family:Playfair Display,serif;margin-bottom:10px;text-transform:uppercase"/>' +
    '<br><button class="action-btn" id="final-submit" style="background:linear-gradient(135deg,#7e57c2,#5e35b1)">打开门 ✨</button>' +
    '<p id="final-feedback" style="margin-top:8px;font-size:.8rem;min-height:1.2em"></p>';
  document.getElementById('modal-overlay').classList.add('show');

  document.getElementById('final-submit').onclick = function() {
    var val = document.getElementById('final-input').value.trim().toUpperCase();
    var fb = document.getElementById('final-feedback');
    if (val === FINAL_PASSWORD) {
      game.doorUnlocked = true;
      fb.style.color = '#43a047';
      fb.textContent = '🎉 密码正确！门打开了！';
      document.getElementById('final-input').disabled = true;
      document.getElementById('final-submit').disabled = true;
      setTimeout(function() {
        closeModal();
        showFinale();
      }, 1500);
    } else {
      fb.style.color = '#e53935';
      fb.textContent = '密码不对，想想气球的颜色顺序...';
    }
  };
  document.getElementById('final-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('final-submit').click();
  });
}

function showFinale() {
  // Confetti explosion
  confetti({ particleCount:300, spread:180, origin:{y:0.5}, colors:['#ffd700','#ff6b6b','#4ecdc4','#ab47bc','#ff9800'], gravity:0.6, ticks:400 });
  setTimeout(function(){ confetti({ particleCount:150, spread:120, origin:{y:0.4}, gravity:0.5, ticks:300 }); }, 500);
  setTimeout(function(){ confetti({ particleCount:100, spread:100, origin:{y:0.6}, gravity:0.4, ticks:250 }); }, 1000);

  // Show letter with handwriting style + typewriter effect
  document.getElementById('modal-emoji').textContent = '💌';
  document.getElementById('modal-title').textContent = 'Happy Birthday, 小宝 Doris! 🎂';
  // Build letter with line-by-line reveal
  var lines = LETTER_TEXT.split('\n');
  var letterHtml = '<div class="letter-content">';
  for (var li = 0; li < lines.length; li++) {
    var lineText = lines[li].trim();
    if (lineText === '') {
      letterHtml += '<br>';
    } else if (lineText.indexOf('— Jerry') === 0) {
      letterHtml += '<div class="letter-signature letter-line" style="animation-delay:' + (li * 0.15) + 's">' + lineText + '</div>';
    } else {
      letterHtml += '<div class="letter-line" style="animation-delay:' + (li * 0.15) + 's">' + lineText + '</div>';
    }
  }
  letterHtml += '</div>';
  document.getElementById('modal-text').innerHTML = letterHtml;
  document.getElementById('modal-extra').innerHTML = '<p style="margin-top:16px;font-size:.85rem;color:#e91e63;font-weight:700">— 永远爱你的 Jerry ❤️</p>';
  document.getElementById('modal-overlay').classList.add('show');

  setSubtitle('🎉 Happy Birthday 小宝 Doris! 愿所有美好如期而至 ✨');
  // Play happy birthday
  var fa = document.getElementById('finale-audio');
  if (fa) { fa.volume = 0.5; fa.play().catch(function(){}); }
  // Show gift selection after letter
  setTimeout(function() { showGiftSelection(); }, 4000);
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('show'); }

// ESC key closes modal
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var overlay = document.getElementById('modal-overlay');
    if (overlay && overlay.classList.contains('show')) {
      closeModal();
    }
  }
});

// Click overlay background to close modal
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
function setSubtitle(t) { var el=document.getElementById('subtitle'); el.textContent=t; el.style.display='block'; }


// ═══ PROGRESS SUBTITLE ═══
function updateSubtitleProgress() {
  var collected = 0;
  if (game.hasKey) collected++;
  if (game.hasGreenNote) collected++;
  if (game.hasPin) collected++;
  if (game.hasRedNote) collected++;
  if (game.hasYellowNote) collected++;
  
  if (collected === 0) {
    setSubtitle('房间里藏着线索和回忆，慢慢探索吧... 🐝 试试点击发光的物件！');
  } else if (game.hasKey && !game.drawerOpen) {
    setSubtitle('🔑 获得钥匙！去试试抽屉吧...');
  } else if (game.hasGreenNote && !game.hasPin) {
    setSubtitle('💚 收集到 1/3 个字母！书架后面好像藏着什么...');
  } else if (game.hasPin && !game.redBalloonPopped) {
    setSubtitle('📌 获得扎针！去扎破一个气球试试吧...');
  } else if (game.hasRedNote && !game.envelopeAnswered) {
    setSubtitle('❤️ 收集到 2/3 个字母！信封上也许有问题...');
  } else if (game.hasYellowNote && !game.doorUnlocked) {
    setSubtitle('🔤 三个字母都齐了！去看看气球颜色顺序，打开那扇门吧！');
  } else if (collected >= 3) {
    setSubtitle('✨ 继续探索，还有更多惊喜等着你...');
  }
}

// ═══ ENTER ROOM ═══
function enterRoom() {
  var landing = document.getElementById('landing');
  var room = document.getElementById('room');
  landing.classList.add('fading');
  setTimeout(function() {
    landing.style.display = 'none';
    room.classList.add('revealing');
    renderRoom();
    setSubtitle('房间里藏着线索和回忆，慢慢探索吧... 🐝 试试点击发光的物件！');
    // Trigger entrance pulse on interactive objects after room appears
    setTimeout(function() {
      var objs = document.querySelectorAll('.obj.interactive');
      objs.forEach(function(el, i) {
        setTimeout(function() { el.classList.add('entering'); }, i * 120);
      });
    }, 400);
  }, 700);
  // Start BGM on user interaction (required by browser autoplay policy)
  var bgm = document.getElementById('bgm-audio');
  if (bgm) { bgm.volume = 0.3; bgm.play().catch(function(e){ console.log('BGM autoplay blocked:', e); }); }
}

// Landing emojis
(function(){var em=['🎈','💗','🎂','✨','🍃','💜','🌸'],ld=document.getElementById('landing');
for(var i=0;i<12;i++){var el=document.createElement('div');el.className='float-emoji';el.textContent=em[Math.floor(Math.random()*em.length)];el.style.left=Math.random()*100+'%';el.style.animationDuration=(6+Math.random()*8)+'s';el.style.animationDelay=Math.random()*6+'s';el.style.fontSize=(1+Math.random()*1.2)+'rem';ld.appendChild(el)}})();

// Bee cursor
var bee=document.getElementById('bee');
document.addEventListener('mousemove',function(e){if(bee){bee.style.left=e.clientX+'px';bee.style.top=e.clientY+'px'}});
document.getElementById('room').addEventListener('mouseenter',function(){document.body.style.cursor='none'});
document.getElementById('room').addEventListener('mouseleave',function(){document.body.style.cursor='default'});

console.log('🔐 Birthday Room v6 - Full puzzle logic loaded.');


// ═══ GIFT SELECTION (3 choices) ═══
function showGiftSelection() {
  closeModal();
  var overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-emoji').textContent = '🎁';
  document.getElementById('modal-title').textContent = '选一个礼物吧！';
  document.getElementById('modal-text').innerHTML = '<p style="color:#666;font-size:.85rem">三选一，每个都是为你精心准备的 ❤️</p>';
  
  var gifts = [
    { img: './assets/礼物选项1.jpg', label: '礼物 A' },
    { img: './assets/礼物选项2.jpg', label: '礼物 B' },
    { img: './assets/礼物选项3.jpg', label: '礼物 C' }
  ];
  
  var html = '<div style="display:flex;gap:12px;justify-content:center;margin-top:16px;flex-wrap:wrap">';
  for (var i = 0; i < gifts.length; i++) {
    html += '<style>.gift-card:hover{transform:scale(1.08)!important;border-color:#e91e63!important}</style><div class="gift-card" data-idx="' + i + '" style="width:140px;cursor:pointer;transition:all .3s;border-radius:12px;overflow:hidden;border:2px solid transparent;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.08)">' +
      '<img src="' + gifts[i].img + '" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="' + gifts[i].label + '"/>' +
      '<p style="text-align:center;padding:8px;font-size:.75rem;color:#666;margin:0">' + gifts[i].label + '</p></div>';
  }
  html += '</div>';
  
  document.getElementById('modal-extra').innerHTML = html;
  overlay.classList.add('show');
  
  // Click handler for gift cards
  document.querySelectorAll('.gift-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var idx = this.getAttribute('data-idx');
      // Highlight selected
      document.querySelectorAll('.gift-card').forEach(function(c) { c.style.opacity = '.4'; c.style.transform = 'scale(.95)'; });
      this.style.opacity = '1'; this.style.transform = 'scale(1.1)'; this.style.borderColor = '#e91e63';
      
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#ffd700','#ff6b6b','#4ecdc4'] });
      
      document.getElementById('modal-extra').innerHTML += '<p style="margin-top:16px;color:#e91e63;font-weight:700;font-size:.9rem">🎉 已选择 ' + gifts[idx].label + '！</p>';
      
      // After choosing, show photo wall
      setTimeout(function() {
        closeModal();
        showPhotoWall();
      }, 2000);
    });
  });
}


// ═══ PHOTO WALL (Lomo style, shown after finale) ═══
function showPhotoWall() {
  var wall = document.getElementById('photo-wall');
  if (!wall) return;
  wall.style.display = 'block';
  var grid = document.getElementById('photo-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (var i = 1; i <= 50; i++) {
    var num = (i < 10 ? '0' : '') + i;
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;padding:8px 8px 24px;border-radius:2px;box-shadow:0 4px 16px rgba(0,0,0,.3);transform:rotate(' + (Math.random()*4-2) + 'deg);transition:transform .3s;cursor:pointer';
    card.onmouseenter = function() { this.style.transform = 'rotate(0deg) scale(1.03)'; this.style.zIndex = '10'; };
    card.onmouseleave = function() { this.style.transform = 'rotate(' + (Math.random()*4-2) + 'deg) scale(1)'; this.style.zIndex = ''; };
    var img = document.createElement('img');
    img.src = './assets/images/photos/photo_' + num + '.jpg';
    img.alt = 'Photo ' + i; img.loading = 'lazy';
    img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:1px;display:block;filter:saturate(1.1) contrast(1.05)';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;overflow:hidden;border-radius:1px';
    wrap.appendChild(img);
    var vig = document.createElement('div');
    vig.style.cssText = 'position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,.25) 100%);pointer-events:none';
    wrap.appendChild(vig);
    card.appendChild(wrap);
    grid.appendChild(card);
  }
}

