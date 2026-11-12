const stop = new Set('a an the is are am i me my you your he his him she they it and or of to for in on with about what which how does do can tell please would be this that as at work works yiju eason zhao'.split(' '));
export function lookup(question, records, limit = 3) {
  const q = question.toLowerCase().normalize('NFKC');
  if (/^who (?:is|are) (?:yiju|eason|he|you)\b|introduce yourself|介绍|你是谁|个人简介/.test(q)) return records.filter(r => ['identity', 'experience'].includes(r.id));
  if (/where (?:does|is|are).*(?:\byou\b|\bhe\b|yiju|eason)|where.*based|所在|现居|你在哪里/.test(q)) return records.filter(r => r.id === 'identity');
  if (/why.*hire|why should|fit for|适合.*岗位|为什么.*招聘/.test(q)) return records.filter(r => ['experience', 'focus-1', 'focus-2'].includes(r.id));
  if (/what (?:does|is).*(?:work|doing)|目前|正在做|做什么/.test(q)) return records.filter(r => ['identity', 'experience'].includes(r.id));
  const tokens = [...new Set((q.match(/[\p{L}\p{N}+#-]+/gu) || []).filter(t => !stop.has(t) && t.length > 1))];
  // Match CJK keyword substrings too; English word splitting alone loses them.
  const ranked = records.map((r, order) => {
    const keywords = r.keywords.toLowerCase().split(' ');
    const searchable = `${r.title} ${r.text}`.toLowerCase();
    let score = tokens.reduce((n, t) => n + (keywords.includes(t) ? 5 : searchable.includes(t) ? 1 : 0), 0);
    score += keywords.filter(k => /[\u3400-\u9fff]/.test(k) && q.includes(k)).length * 5;
    return { record: r, score, order };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.order - b.order);
  if (!ranked.length && /^(hi|hello|hey|你好)[!！.。\s]*$/i.test(q)) return records.slice(0, 1);
  return ranked.slice(0, limit).map(x => x.record);
}
