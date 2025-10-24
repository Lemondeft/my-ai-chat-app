import { useState, useEffect, useRef } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";

function ConfigurableAI() {
  // State for API configuration
  const [apiConfig, setApiConfig] = useLocalStorage("ai_api_config", {
    apiKey: "",
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-3.5-turbo",
  });

  // State for personality
  const [personality, setPersonality] = useLocalStorage(
    "ai_personality", 
    "You are a helpful AI assistant"
  );
  
  // State for chat
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // State for chat history
  const [chatHistory, setChatHistory] = useLocalStorage("ai_chat_history", []);
  
  // Ref for auto-scroll
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Handle configuration changes
  const handleConfigChange = (key, value) => {
    setApiConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle chat submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiConfig.apiKey) {
      alert("Error: API Key is required!");
      return;
    }

    if (!input.trim()) {
      alert("Error: Message cannot be empty!");
      return;
    }

    setIsLoading(true);
    
    // Add user message to chat history
    const userMessage = { role: "user", content: input, timestamp: new Date().toLocaleTimeString() };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setInput("");

    try {
      const systemMessage = {
        role: "system",
        content: personality
      };

      // Prepare messages for API (system + all history except current user message)
      const apiMessages = [
        systemMessage,
        ...updatedHistory.map(msg => ({ role: msg.role, content: msg.content }))
      ];

      const res = await fetch(apiConfig.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: apiMessages,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const aiMessage = { 
        role: "assistant", 
        content: data.choices[0].message.content,
        timestamp: new Date().toLocaleTimeString()
      };
      
      // Add AI response to chat history
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = { 
        role: "error", 
        content: `Error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear all chat history?")) {
      setChatHistory([]);
    }
  };

  // Reset all settings
  const resetSettings = () => {
    if (window.confirm("Are you sure you want to reset all settings to default?")) {
      localStorage.removeItem("ai_api_config");
      localStorage.removeItem("ai_personality");
      localStorage.removeItem("ai_chat_history");
      window.location.reload();
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <div className="flex gap-2">
          <button
            onClick={clearChatHistory}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Chat
          </button>
          <button
            onClick={resetSettings}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Side - Configuration */}
        <div className="w-1/3 flex flex-col">
          {/* API Settings */}
          <div className="mb-6 p-4 border rounded-lg bg-gray-50 flex-1">
            <h3 className="text-lg font-semibold mb-3">API Settings</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={apiConfig.apiKey}
                  onChange={(e) => handleConfigChange("apiKey", e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API URL</label>
                <input
                  type="text"
                  value={apiConfig.apiUrl}
                  onChange={(e) => handleConfigChange("apiUrl", e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  value={apiConfig.model}
                  onChange={(e) => handleConfigChange("model", e.target.value)}
                  placeholder="gpt-3.5-turbo"
                  className="w-full p-2 border rounded"
                />
              </div>

              {/* Personality Input */}
              <div>
                <label className="block text-sm font-medium mb-1">AI Personality</label>
                <textarea
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Describe the AI's personality, tone, style, language, etc."
                  className="w-full p-2 border rounded h-24"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Chat */}
        <div className="w-2/3 flex flex-col border rounded-lg">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                No messages yet. Start a conversation!
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg max-w-[80%] ${
                    message.role === "user"
                      ? "bg-blue-500 text-white ml-auto"
                      : message.role === "error"
                      ? "bg-red-100 border border-red-300 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}>
                    {message.timestamp}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="p-3 rounded-lg bg-gray-100 text-gray-800 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">Thinking...</div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                disabled={isLoading || !apiConfig.apiKey}
              >
                {isLoading ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfigurableAI;