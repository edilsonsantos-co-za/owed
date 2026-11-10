// AG Studio's chat renderer only starts a table on a fresh block: a table row straight after a line of
// text (say "**Who owes you money**" then "| Client | ... |") is folded into that paragraph, and the
// whole table comes out as one line of pipes. This puts a blank line in front of such a table.
// It works on streamed deltas, so one instance per text block, fed in order.
export class MarkdownTidy {
  private prev = ''; // the last complete line, trimmed
  private line = ''; // the current line so far
  private indent = ''; // leading whitespace held back until the line's first real character

  push(delta: string): string {
    let out = '';
    for (const ch of delta) {
      if (ch === '\n') {
        out += this.indent + ch;
        this.prev = this.line.trim();
        this.line = '';
        this.indent = '';
        continue;
      }
      if (this.line === '' && (ch === ' ' || ch === '\t')) {
        this.indent += ch;
        continue;
      }
      if (this.line === '' && ch === '|' && this.prev !== '' && !this.prev.startsWith('|')) out += '\n';
      out += this.indent + ch;
      this.indent = '';
      this.line += ch;
    }
    return out;
  }

  /** Whatever whitespace is still held back when the block ends. */
  flush(): string {
    const rest = this.indent;
    this.indent = '';
    return rest;
  }
}

export const tidyMarkdown = (text: string) => {
  const tidy = new MarkdownTidy();
  return tidy.push(text) + tidy.flush();
};
