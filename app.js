const { useState, useEffect, useMemo, useSyncExternalStore, useRef } = React;

// Initialize WebsimSocket
const room = new WebsimSocket();

const AudioEngine = {
  ctx: null,
  async play(url) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.ctx.destination);
      source.start();
    } catch (e) {
      console.error("Audio failed", e);
    }
  }
};

function App() {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('realtime'); // 'realtime' | 'database' | 'docs'
  
  // Realtime State
  const [presence, setPresence] = useState({});
  const [roomState, setRoomState] = useState({});
  const [peers, setPeers] = useState({});

  // Database State (using React 18 sync)
  const messages = useSyncExternalStore(
    room.collection('guestbook_v1').subscribe,
    room.collection('guestbook_v1').getList
  );

  useEffect(() => {
    const init = async () => {
      await room.initialize();
      setIsReady(true);
      
      setPresence(room.presence);
      setRoomState(room.roomState);
      setPeers(room.peers);

      room.subscribePresence(setPresence);
      room.subscribeRoomState(setRoomState);
      // Peers update with presence updates
      room.subscribePresence(() => setPeers({ ...room.peers }));
    };
    init();
  }, []);

  if (!isReady) return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
    </div>
  );

  const me = room.peers[room.clientId];

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Header */}
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <img src={me?.avatarUrl} className="w-10 h-10 rounded-full border-2 border-blue-500" alt="me" />
          <div>
            <div className="font-bold leading-none">{me?.username}</div>
            <div className="text-xs text-slate-400">You (Online)</div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {Object.values(peers).map(peer => (
            peer.username !== me.username && (
              <img key={peer.username} src={peer.avatarUrl} title={peer.username} className="w-8 h-8 rounded-full border border-slate-600 opacity-80" />
            )
          ))}
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex bg-slate-800 shrink-0">
        <button 
          onClick={() => setActiveTab('realtime')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'realtime' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'}`}
        >
          Realtime
        </button>
        <button 
          onClick={() => setActiveTab('database')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'database' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'}`}
        >
          Database
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'docs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400'}`}
        >
          Guide
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-slate-900">
        {activeTab === 'realtime' && <RealtimeTab presence={presence} roomState={roomState} />}
        {activeTab === 'database' && <DatabaseTab messages={messages} />}
        {activeTab === 'docs' && <DocsTab />}
      </main>
    </div>
  );
}

function RealtimeTab({ presence, roomState }) {
  const containerRef = useRef(null);

  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    room.updatePresence({ x, y });
  };

  const updateGlobalColor = (color) => {
    AudioEngine.play('click.mp3');
    room.updateRoomState({ themeColor: color });
  };

  const currentColor = roomState.themeColor || '#3b82f6';

  return (
    <div 
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="h-full w-full relative canvas-area p-6 flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute top-4 left-4 z-10 bg-slate-800/80 p-3 rounded-lg border border-slate-700 backdrop-blur-sm pointer-events-none">
        <h3 className="font-bold text-sm">Realtime Layer</h3>
        <p className="text-xs text-slate-400">Cursors = Presence<br/>Color = RoomState</p>
      </div>

      <div className="flex flex-col items-center gap-6 z-10">
        <div 
          className="w-32 h-32 rounded-2xl shadow-2xl transition-colors duration-300 flex items-center justify-center text-4xl"
          style={{ backgroundColor: currentColor }}
        >
          ✨
        </div>
        
        <div className="flex gap-3">
          {['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'].map(c => (
            <button 
              key={c}
              onClick={() => updateGlobalColor(c)}
              className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Render Cursors */}
      {Object.entries(presence).map(([id, p]) => {
        if (id === room.clientId || !p.x) return null;
        const peer = room.peers[id];
        return (
          <div 
            key={id}
            className="absolute pointer-events-none transition-all duration-75 ease-linear flex flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <img src={peer?.avatarUrl} className="w-6 h-6 rounded-full border border-white shadow-lg" />
            <span className="text-[10px] bg-black/50 px-1 rounded whitespace-nowrap">{peer?.username}</span>
          </div>
        );
      })}
    </div>
  );
}

function DatabaseTab({ messages }) {
  const [text, setText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || isPosting) return;

    setIsPosting(true);
    AudioEngine.play('click.mp3');
    try {
      await room.collection('guestbook_v1').create({
        content: text.trim(),
      });
      setText('');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700">
        <h3 className="font-bold text-sm text-blue-400">Persistent Guestbook</h3>
        <p className="text-xs text-slate-400">Messages here are saved in the database forever.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 flex flex-col-reverse gap-3 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-1">
              <img src={`https://images.websim.com/avatar/${msg.username}`} className="w-5 h-5 rounded-full" />
              <span className="text-xs font-bold text-slate-300">{msg.username}</span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-slate-200 break-words">{msg.content}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 pt-4 border-t border-slate-700 shrink-0">
        <input 
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Leave a message..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <button 
          disabled={isPosting || !text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function DocsTab() {
  const markdown = `
### 🏗️ Architecture Overview

**1. Presence (Realtime)**
Used for cursors. Owned by you. Updates are broadcast instantly.
\`\`\`js
room.updatePresence({ x, y });
\`\`\`

**2. RoomState (Realtime)**
Shared world state. Used for the center color square.
\`\`\`js
room.updateRoomState({ color: '#ff0000' });
\`\`\`

**3. Collections (Database)**
Used for the guestbook. Persists after everyone leaves.
\`\`\`js
room.collection('posts').create({ text });
\`\`\`

**4. Identity**
Websim automatically provides \`username\` and \`avatarUrl\` for all connected users via \`room.peers\`.
  `;

  return (
    <div className="h-full overflow-y-auto p-6 text-slate-300 leading-relaxed">
      <div className="prose prose-invert max-w-none">
        <h2 className="text-xl font-bold text-white mb-4">How it works</h2>
        <div className="space-y-4">
          <p className="text-sm">This application utilizes the <strong>WebsimSocket</strong> API to bridge the gap between ephemeral gameplay and persistent social features.</p>
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <h4 className="text-blue-400 font-bold text-xs uppercase mb-2 tracking-wider">The Realtime Layer</h4>
            <p className="text-sm italic">"I see you moving, and you see me moving."</p>
            <p className="text-xs mt-2">Uses WebRTC/WebSockets for sub-100ms latency. Best for gaming, collaborative editing, and live indicators.</p>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <h4 className="text-green-400 font-bold text-xs uppercase mb-2 tracking-wider">The Persistence Layer</h4>
            <p className="text-sm italic">"The data is still here tomorrow."</p>
            <p className="text-xs mt-2">Uses a cloud database back-end. Each record is cryptographically tied to your Websim identity.</p>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-6">
            <pre className="text-[10px] bg-black/30 p-4 rounded-lg overflow-x-auto text-blue-300 font-mono">
{`// Code Example: Listening to everything
room.subscribePresence(p => console.log("User moved:", p));
room.collection('msgs').subscribe(m => console.log("New message:", m));`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

