/**
 * Chuyển đổi Markdown sang định dạng phù hợp cho từng nền tảng.
 * - Facebook / Zalo / LinkedIn: chỉ hỗ trợ text đơn giản, không hỗ trợ markdown thật sự.
 * - Website: có thể convert sang HTML để render.
 */

// ===================== HÀM 1: FORMAT TEXT CHO NỀN TẢNG =====================

export function formatForPlatform(text: string, platform: 'facebook' | 'zalo' | 'linkedin' | 'twitter'): string {
  let formatted = text;

  // ======= Làm sạch Markdown cơ bản =======

  // In đậm (**text** hoặc __text__) → chỉ giữ text (vì Facebook không hiểu **)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '$1'); // bỏ ** ** 
  formatted = formatted.replace(/__(.*?)__/g, '$1');     // bỏ __ __

  // In nghiêng (*text* hoặc _text_) → chỉ giữ text
  formatted = formatted.replace(/\*(.*?)\*/g, '$1'); // bỏ * *
  formatted = formatted.replace(/_(.*?)_/g, '$1');   // bỏ _ _

  // Link Markdown [text](url) → text (url)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)');

  // Tiêu đề Markdown (## hoặc ###) → viết hoa
  formatted = formatted.replace(/^### (.*)$/gm, '👉 $1');
  formatted = formatted.replace(/^## (.*)$/gm, '🔥 $1');
  formatted = formatted.replace(/^# (.*)$/gm, '🌟 $1');

  // Danh sách gạch đầu dòng
  formatted = formatted.replace(/^- (.*)$/gm, '• $1');

  // Xóa code block ``` ```
  formatted = formatted.replace(/```[\s\S]*?```/g, '');

  // Xóa inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '$1');

  // Xóa các ký tự markdown còn sót
  formatted = formatted.replace(/> (.*)/g, '💬 $1'); // quote block
  formatted = formatted.replace(/\n{3,}/g, '\n\n'); // rút gọn khoảng trắng

  // Thêm hashtag hoặc emoji nếu muốn cá nhân hóa theo platform
  if (platform === 'facebook') {
    formatted += '\n\n#ChiaSe #Inspire';
  } else if (platform === 'zalo') {
    formatted = formatted.replace(/🌟/g, '⭐');
  }

  return formatted.trim();
}

// ===================== HÀM 2: CHUYỂN MARKDOWN → HTML =====================

/**
 * Convert Markdown sang HTML cho website.
 * Sử dụng các regex cơ bản — không cần thêm lib nếu muốn nhẹ.
 */
export function mdToHtml(markdown: string): string {
  let html = markdown;

  // Tiêu đề
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // In đậm / nghiêng
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Link
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Danh sách
  const lines = html.split('\n');
  let inList = false;
  const processedLines = lines.map(line => {
    if (line.trim().startsWith('- ')) {
      if (!inList) {
        inList = true;
        return '<ul><li>' + line.replace(/^-\s*(.*)/, '$1') + '</li>';
      } else {
        return '<li>' + line.replace(/^-\s*(.*)/, '$1') + '</li>';
      }
    } else {
      if (inList) {
        inList = false;
        return line ? '</ul>' + line : line;
      }
      return line;
    }
  });

  if (inList) {
    processedLines[processedLines.length - 1] += '</ul>';
  }

  html = processedLines.join('\n');

  // Code block
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Quote block
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

  // Xuống dòng
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = `<p>${html}</p>`;

  return html.trim();
}
