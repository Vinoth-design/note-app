import React from 'react';

interface MarkdownTextProps {
  text: string;
}

export default function MarkdownText({ text }: MarkdownTextProps) {
  if (!text) return null;

  // Regexes for bold, italic, code, and strikethrough
  // We match inline: **bold**, *italic*, `code`, ~~strikethrough~~
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const italicRegex = /\*([^*]+)\*/g;
  const strikethroughRegex = /~~([^~]+)~~/g;
  const codeRegex = /`([^`]+)`/g;

  // Parse text into tokens
  interface Token {
    type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'code';
    content: string;
  }

  let tokens: Token[] = [{ type: 'text', content: text }];

  // Helper to split text tokens based on a regex pattern
  const splitTokens = (
    currentTokens: Token[],
    regex: RegExp,
    type: Token['type']
  ): Token[] => {
    const result: Token[] = [];
    for (const token of currentTokens) {
      if (token.type !== 'text') {
        result.push(token);
        continue;
      }

      let lastIndex = 0;
      let match;
      // Reset regex index
      regex.lastIndex = 0;

      while ((match = regex.exec(token.content)) !== null) {
        // Text before match
        if (match.index > lastIndex) {
          result.push({
            type: 'text',
            content: token.content.substring(lastIndex, match.index),
          });
        }
        // Match content
        result.push({
          type: type,
          content: match[1],
        });
        lastIndex = regex.lastIndex;
      }

      // Remaining text
      if (lastIndex < token.content.length) {
        result.push({
          type: 'text',
          content: token.content.substring(lastIndex),
        });
      }
    }
    return result;
  };

  // Run the token splits sequentially
  tokens = splitTokens(tokens, boldRegex, 'bold');
  tokens = splitTokens(tokens, strikethroughRegex, 'strikethrough');
  tokens = splitTokens(tokens, codeRegex, 'code');
  tokens = splitTokens(tokens, italicRegex, 'italic');

  return (
    <>
      {tokens.map((token, index) => {
        switch (token.type) {
          case 'bold':
            return (
              <strong key={index} className="font-bold text-slate-900 dark:text-white">
                {token.content}
              </strong>
            );
          case 'italic':
            return (
              <em key={index} className="italic text-slate-800 dark:text-slate-200">
                {token.content}
              </em>
            );
          case 'strikethrough':
            return (
              <span key={index} className="line-through text-slate-400 dark:text-slate-500">
                {token.content}
              </span>
            );
          case 'code':
            return (
              <code
                key={index}
                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs text-rose-500 dark:text-rose-400 border border-slate-200/50 dark:border-slate-700/50"
              >
                {token.content}
              </code>
            );
          default:
            return <span key={index}>{token.content}</span>;
        }
      })}
    </>
  );
}
