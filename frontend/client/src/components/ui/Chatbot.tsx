import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, Trash2, Bot, User, Loader2, ChevronLeft, ChevronRight, ChevronDown,
  Sparkles, Maximize2, Minimize2, MessageSquare, Home, HelpCircle, Search, Plus,
  Building2, DollarSign, BookOpen, Scale, Compass, PenTool
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, Message } from "@shared/schema";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function MarkdownContent({ content }: { content: string }) {
  const safe = escapeHtml(content);
  const formatted = safe
    .replace(/### (.*?)(\n|$)/g, '<h3 class="text-sm font-semibold text-white/90 mt-3 mb-1">$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h2 class="text-sm font-bold text-white/95 mt-3 mb-1">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90 font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/[0.06] px-1.5 py-0.5 rounded text-[11px] font-mono text-blue-400">$1</code>')
    .replace(/^- (.*?)$/gm, '<li class="ml-3 text-white/70 text-[13px] leading-relaxed">• $1</li>')
    .replace(/^\d+\. (.*?)$/gm, '<li class="ml-3 text-white/70 text-[13px] leading-relaxed">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="text-[13px] leading-relaxed text-white/70 [&_h2]:text-white/90 [&_h3]:text-white/85"
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}

const quickTopics = [
  { label: "Floorplan design tips", icon: PenTool, query: "What are the best tips for designing an efficient floorplan?" },
  { label: "Building cost estimates", icon: DollarSign, query: "How do I estimate building construction costs?" },
  { label: "Material selection guide", icon: Building2, query: "What factors should I consider when selecting building materials?" },
  { label: "Construction regulations", icon: Scale, query: "What are common construction regulations I should know about?" },
];

const helpArticles = [
  { label: "How to read architectural blueprints", icon: BookOpen, query: "How do I read and understand architectural blueprints?" },
  { label: "Sustainable building design", icon: Compass, query: "What are the key principles of sustainable building design?" },
  { label: "Structural load calculations", icon: Building2, query: "How do structural load calculations work in building design?" },
  { label: "Interior space planning", icon: PenTool, query: "What are the best practices for interior space planning?" },
  { label: "Zoning laws explained", icon: Scale, query: "Can you explain common zoning laws for residential buildings?" },
  { label: "Energy-efficient architecture", icon: Sparkles, query: "What are the latest trends in energy-efficient architecture?" },
];

type Tab = "home" | "help" | "messages";

export default function Chatbot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<"tabs" | "chat">("tabs");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, streamingContent, scrollToBottom]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      toast({ title: "Failed to load conversations", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen && user) fetchConversations();
  }, [isOpen, user, fetchConversations]);

  const createConversation = async (initialMessage?: string) => {
    try {
      const title = initialMessage ? initialMessage.slice(0, 40) + (initialMessage.length > 40 ? "..." : "") : "New Chat";
      const res = await apiRequest("POST", "/api/chat/conversations", { title });
      const conv = await res.json();
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
      setChatMessages([]);
      setView("chat");

      if (initialMessage) {
        setTimeout(() => {
          setInput(initialMessage);
          setTimeout(() => {
            sendMessageDirect(conv, initialMessage);
          }, 100);
        }, 200);
      }
    } catch {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest("DELETE", `/api/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConv?.id === id) {
        setActiveConv(null);
        setChatMessages([]);
        setView("tabs");
      }
    } catch {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setView("chat");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}/messages`, { credentials: "include" });
      if (res.ok) setChatMessages(await res.json());
    } catch {
      toast({ title: "Failed to load messages", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const sendMessageDirect = async (conv: Conversation, messageText: string) => {
    const userMessage = messageText.trim();
    if (!userMessage || !conv) return;

    const tempUserMsg: Message = {
      id: Date.now(),
      conversationId: conv.id,
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamingContent("");
    setInput("");

    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.content) {
              fullContent += data.content;
              setStreamingContent(fullContent);
            }
            if (data.done) {
              const assistantMsg: Message = {
                id: Date.now() + 1,
                conversationId: conv.id,
                role: "assistant",
                content: fullContent,
                createdAt: new Date(),
              };
              setChatMessages((prev) => [...prev, assistantMsg]);
              setStreamingContent("");
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
              throw parseErr;
            }
          }
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          conversationId: conv.id,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          createdAt: new Date(),
        },
      ]);
      setStreamingContent("");
    }
    setIsStreaming(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConv || isStreaming) return;
    await sendMessageDirect(activeConv, input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickTopic = (query: string) => {
    createConversation(query);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      createConversation(searchQuery.trim());
      setSearchQuery("");
    }
  };

  if (!user) return null;

  const filteredTopics = searchQuery.trim()
    ? quickTopics.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : quickTopics;

  return (
    <>
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsExpanded(false)}
            data-testid="chatbot-backdrop"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            layout
            className={`fixed z-50 rounded-2xl overflow-hidden flex flex-col ${
              isExpanded
                ? "inset-0 m-auto w-[90vw] max-w-[720px] h-[80vh] max-h-[700px]"
                : "bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[70vh] sm:h-[580px] max-h-[calc(100vh-120px)]"
            }`}
            style={{
              background: "linear-gradient(180deg, rgba(10,10,18,0.98) 0%, rgba(5,5,10,0.99) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: isExpanded
                ? "0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            data-testid="chatbot-panel"
          >
            {view === "chat" ? (
              <>
                <div
                  className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, transparent 100%)" }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setView("tabs"); setActiveConv(null); }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                      data-testid="button-back-to-list"
                    >
                      <ChevronLeft className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white/90 leading-tight">ArchitectXpert AI</h3>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[11px] text-white/40">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                      data-testid="button-expand-chatbot"
                    >
                      {isExpanded ? <Minimize2 className="w-4 h-4 text-white/50" /> : <Maximize2 className="w-4 h-4 text-white/50" />}
                    </button>
                    <button
                      onClick={() => { setIsOpen(false); setIsExpanded(false); setView("tabs"); }}
                      className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                      data-testid="button-close-chatbot"
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                    </div>
                  ) : chatMessages.length === 0 && !streamingContent ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/15 to-blue-600/5 flex items-center justify-center border border-blue-500/10 mb-3">
                        <Sparkles className="w-5 h-5 text-blue-400/70" />
                      </div>
                      <p className="text-[13px] text-white/40 leading-relaxed">
                        Ask me about architecture, floorplans, building materials, cost estimation, or building codes.
                      </p>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.role}-${msg.id}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0 border border-blue-500/15 mt-0.5">
                              <Bot className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              msg.role === "user"
                                ? "bg-blue-600/20 border border-blue-500/20 text-white/85 text-[13px]"
                                : "bg-white/[0.03] border border-white/[0.04]"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              <MarkdownContent content={msg.content} />
                            ) : (
                              <span>{msg.content}</span>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center flex-shrink-0 border border-amber-500/15 mt-0.5">
                              <User className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                          )}
                        </div>
                      ))}

                      {streamingContent && (
                        <div className="flex gap-3 justify-start" data-testid="message-streaming">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0 border border-blue-500/15 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white/[0.03] border border-white/[0.04]">
                            <MarkdownContent content={streamingContent} />
                            <span className="inline-block w-1.5 h-4 bg-blue-400/60 animate-pulse ml-0.5 rounded-sm" />
                          </div>
                        </div>
                      )}

                      {isStreaming && !streamingContent && (
                        <div className="flex gap-3 justify-start" data-testid="message-thinking">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0 border border-blue-500/15 mt-0.5">
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div className="rounded-2xl px-4 py-3 bg-white/[0.03] border border-white/[0.04]">
                            <div className="flex gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-4 pb-4 pt-2 flex-shrink-0">
                  <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 focus-within:border-blue-500/30 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about architecture..."
                      rows={isExpanded ? 2 : 1}
                      className={`flex-1 bg-transparent text-white/80 placeholder-white/25 outline-none resize-none leading-relaxed ${
                        isExpanded ? "text-sm max-h-32" : "text-[13px] max-h-24"
                      }`}
                      disabled={isStreaming}
                      data-testid="input-chat-message"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isStreaming}
                      className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 disabled:opacity-30 disabled:hover:bg-blue-600/20 transition-colors flex-shrink-0"
                      data-testid="button-send-message"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/20 text-center mt-2">
                    Architecture & building design topics only
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(20,25,40,0.98) 0%, rgba(15,20,35,0.98) 50%, rgba(10,15,25,0.98) 100%)" }}>
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center border border-blue-500/20">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="font-display text-sm font-bold text-white tracking-wide">ARCHITECTXPERT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-[#141828] flex items-center justify-center">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#141828] flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-[#141828] flex items-center justify-center text-[10px] font-bold text-white">
                          AI
                        </div>
                      </div>
                      <button
                        onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors ml-1"
                        data-testid="button-close-chatbot"
                      >
                        <X className="w-4 h-4 text-white/50" />
                      </button>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <h2 className="text-xl font-display font-bold text-white/95 mb-0.5">
                      Hi there <span className="inline-block animate-wave">👋</span>
                    </h2>
                    <p className="text-lg font-display font-semibold text-white/80">How can we help?</p>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  {tab === "home" && (
                    <div className="p-4 space-y-3">
                      <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search for help"
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/30 outline-none focus:border-blue-500/30 transition-colors pr-10"
                          data-testid="input-search-help"
                        />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2" data-testid="button-search-help">
                          <Search className="w-4 h-4 text-blue-400" />
                        </button>
                      </form>

                      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                        {filteredTopics.map((topic, idx) => (
                          <div
                            key={topic.label}
                            onClick={() => handleQuickTopic(topic.query)}
                            className={`flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                              idx < filteredTopics.length - 1 ? "border-b border-white/[0.04]" : ""
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleQuickTopic(topic.query); }}
                            data-testid={`button-topic-${idx}`}
                          >
                            <span className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors">{topic.label}</span>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                          </div>
                        ))}
                        {filteredTopics.length === 0 && searchQuery.trim() && (
                          <div className="px-4 py-6 text-center">
                            <p className="text-[13px] text-white/40">No matching topics found</p>
                            <button
                              onClick={() => handleQuickTopic(searchQuery.trim())}
                              className="mt-2 text-[13px] text-blue-400 hover:text-blue-300 transition-colors"
                              data-testid="button-ask-search"
                            >
                              Ask AI about "{searchQuery.trim()}"
                            </button>
                          </div>
                        )}
                      </div>

                      <div
                        onClick={() => createConversation()}
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500/[0.08] to-blue-600/[0.04] border border-blue-500/[0.12] hover:from-blue-500/[0.12] hover:to-blue-600/[0.08] transition-all cursor-pointer group"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") createConversation(); }}
                        data-testid="button-ask-question"
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-white/90 mb-0.5">Ask a question</h4>
                          <p className="text-[12px] text-white/40">AI Agent and team can help</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                          <HelpCircle className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "help" && (
                    <div className="p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-white/70 px-1 mb-2">Architecture Topics</h3>
                      <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden">
                        {helpArticles.map((article, idx) => (
                          <div
                            key={article.label}
                            onClick={() => handleQuickTopic(article.query)}
                            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                              idx < helpArticles.length - 1 ? "border-b border-white/[0.04]" : ""
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleQuickTopic(article.query); }}
                            data-testid={`button-help-${idx}`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 transition-colors">
                              <article.icon className="w-3.5 h-3.5 text-white/30 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <span className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors flex-1">{article.label}</span>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "messages" && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-sm font-semibold text-white/70">Conversations</h3>
                        <button
                          onClick={() => createConversation()}
                          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                          data-testid="button-new-conversation"
                        >
                          <Plus className="w-4 h-4 text-white/50" />
                        </button>
                      </div>
                      {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.06] mb-4">
                            <MessageSquare className="w-6 h-6 text-white/20" />
                          </div>
                          <h4 className="text-sm font-medium text-white/50 mb-1.5">No conversations yet</h4>
                          <p className="text-[12px] text-white/30 mb-4 max-w-[200px]">Start a new conversation with our AI architecture assistant</p>
                          <button
                            onClick={() => createConversation()}
                            className="px-5 py-2.5 rounded-xl text-[13px] font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20"
                            data-testid="button-start-chat"
                          >
                            Start a conversation
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {conversations.map((conv) => (
                            <div
                              key={conv.id}
                              onClick={() => openConversation(conv)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openConversation(conv); }}
                              data-testid={`button-conversation-${conv.id}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/15 to-blue-600/5 flex items-center justify-center border border-blue-500/10 flex-shrink-0">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-400/60" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[13px] text-white/70 truncate block">{conv.title}</span>
                                <span className="text-[11px] text-white/25">Tap to continue</span>
                              </div>
                              <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] transition-all"
                                data-testid={`button-delete-conversation-${conv.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-white/30" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 border-t border-white/[0.06]">
                  <div className="flex items-center justify-around py-2">
                    {([
                      { id: "home" as Tab, icon: Home, label: "Home" },
                      { id: "help" as Tab, icon: HelpCircle, label: "Help" },
                      { id: "messages" as Tab, icon: MessageSquare, label: "Messages" },
                    ]).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-colors ${
                          tab === t.id ? "text-blue-400" : "text-white/30 hover:text-white/50"
                        }`}
                        data-testid={`button-tab-${t.id}`}
                      >
                        <t.icon className="w-5 h-5" />
                        <span className={`text-[11px] font-medium ${tab === t.id ? "text-blue-400" : "text-white/30"}`}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all"
        style={{
          background: isOpen
            ? "linear-gradient(135deg, rgba(30,30,40,0.95) 0%, rgba(20,20,30,0.95) 100%)"
            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          border: isOpen ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(59,130,246,0.3)",
          boxShadow: isOpen
            ? "0 8px 25px rgba(0,0,0,0.4)"
            : "0 8px 30px rgba(59,130,246,0.35), 0 0 20px rgba(59,130,246,0.15)",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-toggle-chatbot"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-white/70" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageSquare className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
