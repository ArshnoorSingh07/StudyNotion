import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, ArrowUpRight, BookOpen, ChevronDown, GraduationCap, LoaderCircle, MessageCircle, Plus, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { askAssistant, clearAssistantHistory, getAssistantCourses, getAssistantHistory } from '../../../services/operations/assistantAPI';
import './assistant.css';

const SUGGESTIONS = [
  { icon: BookOpen, title: 'Break it down', detail: 'Understand a tricky concept', question: 'Explain the key concepts in this lecture with a simple example.' },
  { icon: Sparkles, title: 'The key takeaways', detail: 'Make revision a little easier', question: 'Summarize the key points from this lecture.' },
  { icon: GraduationCap, title: 'Test my understanding', detail: 'A quick question, then a hint', question: 'Give me a practice question based on this lecture, with a hint but no answer yet.' },
];

export default function AssistantWidget() {
  const { token } = useSelector(state => state.auth);
  const { user } = useSelector(state => state.profile);
  // A changed account/token remounts the panel and aborts any previous user's requests.
  return <StudyAssistant key={`${user?._id || 'guest'}:${token || ''}`} token={token} user={user} />;
}

function StudyAssistant({ token, user }) {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const launcher = useRef(null);
  const textarea = useRef(null);
  const scrollArea = useRef(null);
  const activeRequest = useRef(null);
  const pending = useRef(false);
  const location = useLocation();
  const routeMatch = location.pathname.match(/^\/(?:view-course|courses)\/([a-f\d]{24})(?:\/section\/([a-f\d]{24})\/sub-section\/([a-f\d]{24}))?/i);
  const routeCourseId = routeMatch?.[1] || '';
  const lectureId = routeCourseId === courseId ? routeMatch?.[3] : undefined;
  const isStudent = !!token && user?.accountType === 'Student';
  const selectedCourse = courses.find(course => course._id === courseId);

  useEffect(() => {
    if (!open || !isStudent) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setLoadingCourses(true);
    setError('');
    getAssistantCourses(token, controller.signal).then(data => {
      if (!current || controller.signal.aborted) return;
      setCourses(data.courses);
      setCourseId(current => data.courses.some(course => course._id === routeCourseId)
        ? routeCourseId : data.courses.some(course => course._id === current) ? current : data.courses[0]?._id || '');
    }).catch(err => {
      if (!current) return;
      if (!controller.signal.aborted) setError(err.message);
      else setError('Loading your courses took too long. Please try again.');
    }).finally(() => { clearTimeout(timer); if (current) setLoadingCourses(false); });
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [open, isStudent, token, routeCourseId, retry]);

  useEffect(() => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    pending.current = false;
    setBusy(false);
    setMessages([]);
    setInput('');
    setReady(false);
    if (!courseId || !isStudent) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    getAssistantHistory(token, courseId, controller.signal).then(data => {
      if (!current) return;
      setMessages(data.messages);
      setReady(true);
      setError('');
    }).catch(err => {
      if (current) setError(controller.signal.aborted ? 'Loading your chat took too long. Please try again.' : err.message);
    }).finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); activeRequest.current?.abort(); };
  }, [courseId, token, isStudent, retry]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = event => {
      if (event.key === 'Escape') { setOpen(false); launcher.current?.focus(); }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (open && ready && !busy) textarea.current?.focus();
  }, [open, ready, busy]);

  useEffect(() => {
    const container = scrollArea.current;
    if (container) container.scrollTop = messages.length ? container.scrollHeight : 0;
  }, [messages, busy, open]);

  async function sendQuestion(question = input) {
    const text = question.trim();
    if (!text || !ready || !courseId || pending.current || text.length > 2000) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setInput('');
    const requestId = Date.now();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timer = setTimeout(() => controller.abort(), 65000);
    setMessages(previous => [...previous,
      { role: 'user', content: text, requestId },
      { role: 'assistant', content: '', sources: [], requestId }]);
    try {
      await askAssistant(token, { courseId, lectureId, question: text }, controller.signal, event => {
        if (activeRequest.current !== controller) return;
        setMessages(previous => previous.map(message => message.requestId === requestId && message.role === 'assistant'
          ? { ...message, content: event.type === 'delta' ? message.content + event.text : message.content,
            sources: event.type === 'done' ? event.sources : message.sources } : message));
      });
    } catch (err) {
      if (activeRequest.current === controller) {
        setMessages(previous => previous.map(message => message.requestId === requestId && message.role === 'assistant'
          ? { ...message, isError: true, content: controller.signal.aborted ? 'Answer stopped. You can try your question again.' : err.message, retryQuestion: text } : message));
      }
    } finally {
      clearTimeout(timer);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        pending.current = false;
        setBusy(false);
      }
    }
  }

  async function newChat() {
    if (pending.current || !ready) return;
    pending.current = true;
    setBusy(true);
    try {
      await clearAssistantHistory(token, courseId);
      setMessages([]);
      setError('');
    } catch (err) { setError(err.message); }
    finally { pending.current = false; setBusy(false); }
  }

  return <div className="sn-ai">
    {open && <section className="sn-ai-panel" role="dialog" aria-modal="false" aria-labelledby="sn-ai-title">
      <header className="sn-ai-header">
        <div className="sn-ai-avatar"><Sparkles size={22} strokeWidth={1.7} /></div>
        <div className="sn-ai-heading"><h2 id="sn-ai-title">Study companion <span>AI</span></h2><p>A little clarity. A lot of possibility.</p></div>
        <button className="sn-ai-icon-button" onClick={() => setOpen(false)} aria-label="Close study assistant"><X size={19} /></button>
      </header>

      {!token ? <div className="sn-ai-gate">
        <div className="sn-ai-welcome-icon"><GraduationCap size={35} /></div>
        <span className="sn-ai-eyebrow">YOUR PERSONAL STUDY SPACE</span>
        <h3>Big questions?<br />Let’s work through them.</h3>
        <p>Get clear explanations, quick recaps, and practice questions from your enrolled courses.</p>
        <Link to="/login" className="sn-ai-primary" onClick={() => setOpen(false)}>Log in to start learning <ArrowUpRight size={18} /></Link>
        <span className="sn-ai-footnote">Made for your learning journey.</span>
      </div> : !isStudent ? <div className="sn-ai-gate">
        <div className="sn-ai-welcome-icon"><BookOpen size={32} /></div>
        <h3>Better notes.<br />Better understanding.</h3>
        <p>The study companion is for student accounts. Add lesson notes or transcripts in your course builder to help your students learn.</p>
        <Link to="/dashboard/my-courses" className="sn-ai-primary" onClick={() => setOpen(false)}>Go to my courses <ArrowUpRight size={18} /></Link>
      </div> : <>
        <div className="sn-ai-context">
          <BookOpen size={16} />
          <div className="sn-ai-select-wrap">
            <label htmlFor="sn-ai-course">{lectureId ? 'CURRENT LECTURE · COURSE CONTEXT' : 'LEARNING TOGETHER IN'}</label>
            <select id="sn-ai-course" value={courseId} disabled={busy || loadingCourses || !courses.length} onChange={event => setCourseId(event.target.value)}>
              {!courses.length && <option value="">{loadingCourses ? 'Finding your courses…' : 'Your enrolled courses'}</option>}
              {courses.map(course => <option key={course._id} value={course._id}>{course.courseName}</option>)}
            </select>
          </div>
          <ChevronDown size={14} />
          <button className="sn-ai-icon-button" title="Start a new chat" aria-label="Start a new chat" disabled={!ready || busy || !messages.length} onClick={newChat}><Plus size={18} /></button>
        </div>

        <div className="sn-ai-conversation" ref={scrollArea} role="log" aria-label="Study conversation" aria-live="polite" aria-relevant="additions">
          {error && <div className="sn-ai-error" role="alert">{error}<button onClick={() => { setError(''); setRetry(value => value + 1); }} disabled={busy}><RotateCcw size={13} /> Try again</button></div>}
          {loadingCourses || (courseId && !ready && !error) ? <div className="sn-ai-loading"><LoaderCircle className="sn-ai-spin" size={22} /><p>Opening your study space…</p></div>
            : !courses.length && !error ? <div className="sn-ai-empty"><BookOpen size={32} /><h3>Your next chapter awaits</h3><p>Once you enroll in a published course, we can explore its lessons together.</p><Link to="/" onClick={() => setOpen(false)}>Explore StudyNotion <ArrowUpRight size={15} /></Link></div>
            : !messages.length && ready ? <div className="sn-ai-welcome">
              <div className="sn-ai-welcome-icon"><Sparkles size={30} strokeWidth={1.5} /></div>
              <span className="sn-ai-eyebrow">A FRESH PERSPECTIVE</span>
              <h3>Hey {user?.firstName || 'there'},<br />what’s on your mind?</h3>
              <p>Let’s make sense of {selectedCourse?.courseName || 'your course'}, one question at a time.</p>
              <div className="sn-ai-suggestions">{SUGGESTIONS.map(({ icon: Icon, title, detail, question }) => <button key={title} onClick={() => sendQuestion(lectureId ? question : question.replace('this lecture', 'this course'))} disabled={busy}>
                <span className="sn-ai-suggestion-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight size={15} />
              </button>)}</div>
            </div> : messages.map((message, index) => <div key={`${message.requestId || 'saved'}-${index}`} className={`sn-ai-message sn-ai-${message.role}`}>
              {message.role === 'assistant' && <div className="sn-ai-message-label"><Sparkles size={13} /> STUDY COMPANION</div>}
              <div className={`sn-ai-bubble ${message.isError ? 'sn-ai-failed' : ''}`}>
                {message.content ? <ReactMarkdown components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{message.content}</ReactMarkdown>
                  : <span className="sn-ai-thinking" role="status"><i /><i /><i /><span>Connecting the dots</span></span>}
              </div>
              {message.sources?.length > 0 && !message.isError && <div className="sn-ai-sources"><span>COURSE REFERENCES</span>{message.sources.map(source => <Link key={source.id} to={source.url} title={source.excerpt} onClick={() => setOpen(false)}><BookOpen size={12} /><span>[{source.id}] {source.title}</span><ArrowUpRight size={12} /></Link>)}</div>}
              {message.isError && <button className="sn-ai-retry" disabled={busy} onClick={() => { setInput(message.retryQuestion); textarea.current?.focus(); }}><RotateCcw size={12} /> Try this question again</button>}
            </div>)}
        </div>

        <form className="sn-ai-composer" onSubmit={event => { event.preventDefault(); sendQuestion(); }}>
          <div className="sn-ai-input-wrap">
            <textarea ref={textarea} aria-label="Ask your study companion" placeholder={courseId ? 'Ask a question, find your clarity…' : 'Choose an enrolled course to begin'} value={input} rows={2} maxLength={2000} disabled={!ready || busy} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendQuestion(); } }} />
            {busy && activeRequest.current ? <button type="button" className="sn-ai-send" aria-label="Stop answer" onClick={() => activeRequest.current?.abort()}><Square size={15} fill="currentColor" /></button>
              : <button type="submit" className="sn-ai-send" aria-label="Send question" disabled={!input.trim() || !ready || busy}><ArrowUp size={20} /></button>}
          </div>
          <div className="sn-ai-composer-footer"><span><Sparkles size={11} /> Learn with AI. Check the sources.</span><span>{input.length > 1800 ? `${input.length}/2000` : '↵ to send'}</span></div>
        </form>
      </>}
    </section>}

    <button ref={launcher} className={`sn-ai-launcher ${open ? 'sn-ai-launcher-open' : ''}`} aria-label={open ? 'Close study assistant' : 'Open AI study assistant'} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="sn-ai-launcher-icon">{open ? <X size={22} /> : <Sparkles size={23} strokeWidth={1.8} />}</span>
      <span className="sn-ai-launcher-copy"><strong>Ask AI</strong><small>Your study companion</small></span>
      {!open && <span className="sn-ai-online-dot" />}
    </button>
    {!open && <span className="sn-ai-launcher-hint"><MessageCircle size={12} /> A little help goes a long way</span>}
  </div>;
}
