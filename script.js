// --- Piezas ---
const P = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙', k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' };
const STORAGE='ajedrez_records';
let state = {
  board:null,selected:null,turn:'w',lives:3,score:0,level:1,
  aiLevel:1,playing:true,lastMove:null,
  mode:'ai' // <-- NUEVO: 'ai' (Jugador vs IA) o 'pvp' (Jugador vs Jugador)
};

// --- DOM ---
const boardWrap=document.getElementById('boardWrap');
const lvlEl=document.getElementById('lvl');
const livesEl=document.getElementById('lives');
const scoreEl=document.getElementById('score');
const turnEl=document.getElementById('turn');
const toastEl=document.getElementById('toast');
const scoresDiv=document.getElementById('scores');
const statusEl=document.getElementById('status');

// --- Inicializar tablero ---
function initialBoard(){
  return [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
}

// --- Auxiliares ---
function cloneBoard(b){ return b.map(r=>r.slice()); }
function inBounds(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function isWhite(p){ return p && p===p.toUpperCase(); }
function isBlack(p){ return p && p===p.toLowerCase(); }
function enemyPieces(p,color){ return color==='w'?isBlack(p):isWhite(p); }

// --- Movimientos ---
function movesForPiece(r,c,boardParam){
  const board=boardParam||state.board;
  const p=board[r][c]; if(!p) return [];
  const moves=[]; const color=isWhite(p)?'w':'b';
  const enemy=color==='w'?isBlack:isWhite;
  const t=p.toLowerCase();

  if(t==='p'){
    const dir=color==='w'?-1:1;
    if(inBounds(r+dir,c) && !board[r+dir][c]) moves.push({r:r+dir,c, capture:false});
    for(const dc of [-1,1]){
      const nr=r+dir,nc=c+dc;
      if(inBounds(nr,nc) && board[nr][nc] && enemy(board[nr][nc]) && board[nr][nc].toLowerCase()!=='k') 
        moves.push({r:nr,c:nc, capture:true});
    }
    return moves;
  }

  if(t==='n'){
    const deltas=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for(const d of deltas){
      const nr=r+d[0],nc=c+d[1];
      if(inBounds(nr,nc) && (!board[nr][nc] || (enemy(board[nr][nc]) && board[nr][nc].toLowerCase()!=='k')))
        moves.push({r:nr,c:nc,capture:!!board[nr][nc]});
    }
    return moves;
  }

  // Torre, Alfil y Reina
  const directions = {
    r:[[1,0],[-1,0],[0,1],[0,-1]],
    b:[[1,1],[1,-1],[-1,1],[-1,-1]],
    q:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
  };
  const dirArr = directions[t];
  if(dirArr){
    for(const d of dirArr){
      let nr=r+d[0], nc=c+d[1];
      while(inBounds(nr,nc)){
        if(!board[nr][nc]) moves.push({r:nr,c:nc,capture:false});
        else {
          if(enemy(board[nr][nc]) && board[nr][nc].toLowerCase()!=='k') moves.push({r:nr,c:nc,capture:true});
          break;
        }
        nr+=d[0]; nc+=d[1];
      }
    }
    return moves;
  }

  // Rey
  if(t==='k'){
    for(const dr of [-1,0,1]){
      for(const dc of [-1,0,1]){
        if(dr===0 && dc===0) continue;
        const nr=r+dr,nc=c+dc;
        if(inBounds(nr,nc) && (!board[nr][nc] || (enemy(board[nr][nc]) && board[nr][nc].toLowerCase()!=='k')))
          moves.push({r:nr,c:nc,capture:!!board[nr][nc]});
      }
    }
  }

  return moves;
}

// --- Renderizado ---
function render(){
  boardWrap.innerHTML='';
  for(let row=0;row<9;row++){
    for(let col=0;col<9;col++){
      if(col===0 && row<8){ 
        const div=document.createElement('div'); 
        div.className='coord-left'; div.style.gridRow=row+1; div.style.gridColumn=1; div.textContent=8-row; 
        boardWrap.appendChild(div); 
        continue; 
      }
      if(row===8 && col>0){ 
        const div=document.createElement('div'); 
        div.className='coord-bottom'; div.style.gridRow=9; div.style.gridColumn=col; div.textContent=String.fromCharCode(96+col); 
        boardWrap.appendChild(div); 
        continue; 
      }
      if(col===0 && row===8){ 
        const div=document.createElement('div'); div.style.gridRow=9; div.style.gridColumn=1; boardWrap.appendChild(div); continue; 
      }
      if(col>0 && row<8){
        const r=row,c=col-1;
        const cell=document.createElement('div'); 
        cell.className='cell '+((r+c)%2?'dark':'light'); 
        cell.dataset.r=r; cell.dataset.c=c;
        const p=state.board[r][c]; if(p) cell.textContent=P[p];
        cell.addEventListener('click',onCellClick);
        boardWrap.appendChild(cell);
      }
    }
  }
  if(state.selected){
    const moves=movesForPiece(state.selected.r,state.selected.c);
    moves.forEach(m=>{
      const idx=(m.r*9)+(m.c+1);
      const cell=boardWrap.children[idx];
      const dot=document.createElement('div');
      dot.className='point'+(m.capture?'-point':'');
      cell.appendChild(dot);
    });
  }

  lvlEl.textContent='Nivel: '+state.level+' ('+(state.aiLevel===1?'Fácil':state.aiLevel===2?'Medio':'Extremo')+')';
  livesEl.textContent='Vidas: '+state.lives;
  scoreEl.textContent='Puntos: '+state.score;
  turnEl.textContent = 'Turno: ' + (
    state.turn === 'w'
      ? 'Blanco (' + (state.mode === 'pvp' ? 'Jugador 1' : 'Tú') + ')'
      : (state.mode === 'pvp' ? 'Negro (Jugador 2)' : 'Negro (IA)')
  );
}

// --- Promoción ---
function promotePawn(r,c,isAI=false){
  const p = state.board[r][c];
  if(!p) return;
  if((p==='P' && r===0) || (p==='p' && r===7)){
    if(isAI){
      state.board[r][c] = p==='P'?'Q':'q';
      return;
    }
    const modal=document.createElement('div');
    modal.style.position='fixed'; modal.style.inset='0'; modal.style.background='rgba(0,0,0,0.5)';
    modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.style.zIndex='1000';
    const box=document.createElement('div');
    box.style.background='white'; box.style.padding='20px'; box.style.borderRadius='10px';
    box.style.display='flex'; box.style.gap='10px'; box.style.fontSize='30px';
    const options = p==='P'?['Q','R','B','N']:['q','r','b','n'];
    options.forEach(op=>{
      const btn=document.createElement('button');
      btn.textContent=P[op];
      btn.style.fontSize='30px';
      btn.addEventListener('click',()=>{
        state.board[r][c]=op;
        document.body.removeChild(modal);
        render();
      });
      box.appendChild(btn);
    });
    modal.appendChild(box);
    document.body.appendChild(modal);
  }
}

// --- Comprobar victoria ---
function checkGameOver(){
  let whiteKing=false, blackKing=false;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p = state.board[r][c];
    if(p==='K') whiteKing=true;
    if(p==='k') blackKing=true;
  }
  if(!whiteKing || !blackKing){
    alert('¡Partida finalizada!'); 
    state.playing=false; 
    saveRecord();
    return true;
  }
  return false;
}

// --- Juego ---
function startMatch(){
  state.board=initialBoard();
  state.selected=null;
  state.turn='w';
  state.playing=true;
  state.lastMove=null;
  state.aiLevel=+document.getElementById('difficulty').value;
  state.mode=document.getElementById('mode').value; // <-- NUEVO
  state.lives = Math.max(state.lives,1);
  state.score = 0;
  statusEl.textContent='En progreso';
  render();
}

function onCellClick(e){
  if(!state.playing) return;
  const r=+e.currentTarget.dataset.r, c=+e.currentTarget.dataset.c;
  const p=state.board[r][c];

  if(state.selected){
    const moves=movesForPiece(state.selected.r,state.selected.c);
    const chosen=moves.find(m=>m.r===r && m.c===c);
    if(!chosen){
      if(p && (
        (state.turn==='w' && isWhite(p)) ||
        (state.turn==='b' && isBlack(p) && state.mode==='pvp')
      )){
        state.selected={r,c};
        render(); return;
      }
      toastEl.textContent='Movimiento inválido';
      setTimeout(()=>toastEl.textContent='',2000);
      state.selected=null; render(); return;
    }

    state.board[r][c]=state.board[state.selected.r][state.selected.c];
    state.board[state.selected.r][state.selected.c]='';
    state.selected=null;
    promotePawn(r,c);
    state.turn = (state.turn==='w')?'b':'w';
    render();

    if(!checkGameOver()){
      if(state.mode==='ai' && state.turn==='b'){
        setTimeout(aiMove,300);
      }
    }
    return;
  }

  if(p && (
    (state.turn==='w' && isWhite(p)) ||
    (state.turn==='b' && isBlack(p) && state.mode==='pvp')
  )){
    state.selected={r,c};
    render();
    return;
  }
}

function aiMove(){
  if(!state.playing) return;
  const moves=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=state.board[r][c]; 
    if(p && isBlack(p)){
      const ms=movesForPiece(r,c);
      ms.forEach(m=>moves.push({fr:r,fc:c,tr:m.r,tc:m.c}));
    }
  }
  if(moves.length===0){ 
    alert('¡Has ganado!'); 
    nextLevel(); 
    return; 
  }
  const m=moves[Math.floor(Math.random()*moves.length)];
  state.board[m.tr][m.tc]=state.board[m.fr][m.fc];
  state.board[m.fr][m.fc]='';
  promotePawn(m.tr,m.tc,true);
  state.turn='w'; render();
  checkGameOver();
}

// --- Records ---
function saveRecord() {
  const playerName = prompt("Ingresa tu nombre para guardar tu puntuación:");
  if(!playerName) return;
  const records = JSON.parse(localStorage.getItem(STORAGE) || '[]');
  records.push({ name: playerName, score: state.score, level: state.level });
  records.sort((a,b)=>b.score-a.score);
  localStorage.setItem(STORAGE, JSON.stringify(records));
  renderScores();
}

function nextLevel() {
  state.level += 1;
  state.score += 50;
  alert(`¡Has pasado al nivel ${state.level}!`);
  saveRecord();
  startMatch();
}

function renderScores(){ 
  const arr=JSON.parse(localStorage.getItem(STORAGE)||'[]'); 
  if(arr.length===0){ scoresDiv.innerHTML='<p>No hay récords.</p>'; return; } 
  scoresDiv.innerHTML='<table><tr><th>#</th><th>Nombre</th><th>Puntos</th><th>Nivel</th></tr>'
    + arr.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.score}</td><td>${r.level}</td></tr>`).join('')
    + '</table>'; 
}

// --- Descargar / Reset ---
document.getElementById('downloadScores').addEventListener('click',()=>{
  const data = JSON.stringify(JSON.parse(localStorage.getItem(STORAGE)||'[]'),null,2);
  const blob = new Blob([data],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='scores.json';
  a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('resetScores').addEventListener('click',()=>{
  if(confirm('¿Borrar récords?')) localStorage.removeItem(STORAGE); renderScores();
});

// --- Iniciar ---
document.getElementById('newGame').addEventListener('click',startMatch);
startMatch();
renderScores();
