import { KeyboardEvent, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  messages: ChatMessage[];
  onSend: (message: string) => void;
};

const AIChatPanel = ({ messages, onSend }: Props) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-xs rounded-lg bg-gray-200 px-3 py-2 text-sm"
                  : "max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 p-4 flex gap-2 items-end">
        <textarea
          className="flex-1 resize-none rounded border border-gray-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="use @ to reference context, / for template prompts"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default AIChatPanel;
