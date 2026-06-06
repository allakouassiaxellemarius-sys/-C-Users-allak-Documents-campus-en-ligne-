import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAIAssistant, type Message } from '@/hooks/useAIAssistant';
import { Bot, Send, Trash2, User, Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  'Quels sont mes cours aujourd\'hui ?',
  'Donne-moi mes notes',
  'Quel est mon emploi du temps ?',
  'Aide',
];

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted text-muted-foreground rounded-tl-sm'
      }`}>
        <p className="text-sm leading-relaxed">{msg.content}</p>
        <span className={`text-[10px] mt-1 block opacity-60 ${
          isUser ? 'text-right' : 'text-left'
        }`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const { messages, isTyping, sendMessage, clearMessages } = useAIAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;
    sendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <Card className="flex-1 flex flex-col shadow-lg border-border/50">
        <CardHeader className="pb-3 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Assistant IA</CardTitle>
                <p className="text-xs text-muted-foreground">Posez vos questions sur la vie étudiante</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={clearMessages} title="Nouvelle conversation">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="flex flex-col gap-4 p-4">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-2 text-center">Suggestions</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { sendMessage(s); }}
                  className="px-3 py-1.5 text-xs rounded-full border bg-background hover:bg-muted transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <CardFooter className="p-3 pt-2 border-t flex-shrink-0">
          <div className="flex w-full gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              disabled={isTyping}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
