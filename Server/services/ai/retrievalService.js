// Course-scoped lexical RAG. Reads current content, so edits/deletions take effect
// immediately. This can be replaced by a vector retriever without changing chat.
const STOP_WORDS = new Set('a an the is are was were be been to of in on for with and or it this that these those me my you your please explain summarize summary lecture lesson course give what how why can do does'.split(' '));

const FOLLOW_UP_WORDS = new Set('again simply simpler simple mean means meaning example examples detail details more further elaborate clarify understand help tell'.split(' '));
const topicTerms = text => tokens(text).filter(word => !FOLLOW_UP_WORDS.has(word));

function tokens(text) {
  return (String(text || '').toLowerCase().match(/[\p{L}\p{N}+#]+/gu) || [])
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

function chunkText(text, size = 220, overlap = 35) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(' '));
    if (i + size >= words.length) break;
  }
  return chunks;
}

function coursePassages(course) {
  const passages = [];
  const append = (text, source) => chunkText(text).forEach((content, index) =>
    passages.push({ ...source, content, passage: index + 1 }));
  append([course.courseDescription, course.whatYouWillLearn].filter(Boolean).join('\n'), {
    title: `${course.courseName} — overview`, url: `/courses/${course._id}`,
  });
  for (const section of course.courseContent || []) {
    for (const lecture of section.subSection || []) {
      append([lecture.description, lecture.assistantNotes].filter(Boolean).join('\n'), {
        title: lecture.title, sectionName: section.sectionName,
        lectureId: String(lecture._id), sectionId: String(section._id),
        url: `/view-course/${course._id}/section/${section._id}/sub-section/${lecture._id}`,
      });
    }
  }
  return passages;
}

function retrieve(course, question, lectureId, history = []) {
  const allPassages = coursePassages(course);
  const refersToLecture = lectureId && /this (lecture|lesson)|current (lecture|lesson)/i.test(question);
  const passages = refersToLecture ? allPassages.filter(p => p.lectureId === lectureId) : allPassages;
  const query = topicTerms(question);
  // Only vague follow-ups inherit the most recent explicit topic.
  const previousTopic = query.length ? undefined : [...history].reverse()
    .find(message => message.role === 'user' && topicTerms(message.content).length);
  const previousTerms = previousTopic ? topicTerms(previousTopic.content) : [];
  const terms = [...new Set(query.length ? query : previousTerms)];
  const documents = passages.map(p => tokens(`${p.title} ${p.content}`));
  const averageLength = documents.reduce((sum, d) => sum + d.length, 0) / (documents.length || 1);
  const frequency = new Map(terms.map(term => [term, documents.filter(d => d.includes(term)).length]));
  const ranked = passages.map((passage, index) => {
    const document = documents[index];
    let score = 0;
    for (const term of terms) {
      const tf = document.filter(word => word === term).length;
      if (!tf) continue;
      const idf = Math.log(1 + (documents.length - frequency.get(term) + 0.5) / (frequency.get(term) + 0.5));
      score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * document.length / (averageLength || 1)));
    }
    if (score > 0 && passage.lectureId === lectureId) score *= 1.3;
    return { ...passage, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);

  const broadRequest = /summari[sz]e|key (points|concepts)|quiz|practice question|simpler|this (lecture|lesson|course)|explain (it|that|again)/i.test(question);
  const selected = ranked.length ? ranked.slice(0, 5)
    : broadRequest || previousTerms.length
      ? passages.filter(p => !lectureId || p.lectureId === lectureId).slice(0, 5)
      : [];

  return selected.map((p, index) => ({ ...p, id: index + 1 }));
}

module.exports = { chunkText, coursePassages, retrieve };
