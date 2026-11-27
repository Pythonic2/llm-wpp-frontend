import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CircleHelp, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Role } from "./types";
import { visibleTourTopics } from "./tourTopics";
import "./tour.css";

export function TourGuide({ role }: { role: Role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const topics = visibleTourTopics(role);
  const [open, setOpen] = useState(false);
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "dashboard");
  const [stepIndex, setStepIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const topic = topics.find((item) => item.id === topicId) ?? topics[0];
  const step = topic.steps[Math.min(stepIndex, topic.steps.length - 1)];

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  const start = () => {
    const current = topics.find((item) => item.path === location.pathname);
    setTopicId(current?.id ?? topics[0].id);
    setStepIndex(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <>
    <button ref={triggerRef} type="button" className="tour-trigger" onClick={start} aria-label="Abrir tour do sistema"><CircleHelp size={16} /> <span>Tour</span></button>
    {open && <div className="tour-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialogRef} className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-intro">
        <header className="tour-header"><div><span className="tour-eyebrow">GUIA INTERATIVO</span><h2 id="tour-title">Conheça o Gest Tech</h2><p id="tour-intro">Escolha um módulo e clique nas etapas para entender seus campos e ações.</p></div><button ref={closeRef} type="button" className="tour-close" onClick={close} aria-label="Fechar tour"><X size={19} /></button></header>
        <div className="tour-body">
          <nav className="tour-topics" aria-label="Módulos do tour">
            {topics.map((item) => <button key={item.id} type="button" className={item.id === topic.id ? "tour-topic active" : "tour-topic"} aria-current={item.id === topic.id ? "step" : undefined} onClick={() => { setTopicId(item.id); setStepIndex(0); }}><span>{item.title}</span><ArrowRight size={14} /></button>)}
          </nav>
          <div className="tour-detail" key={topic.id}>
            <span className="tour-count">MÓDULO {topics.findIndex((item) => item.id === topic.id) + 1} DE {topics.length}</span>
            <h3>{topic.title}</h3><p className="tour-summary">{topic.summary}</p>
            <div className="tour-step-list" aria-label={`Etapas de ${topic.title}`}>{topic.steps.map((item, index) => <button key={item.title} type="button" className={index === stepIndex ? "tour-step active" : "tour-step"} aria-label={`${index + 1} ${item.title}`} aria-pressed={index === stepIndex} onClick={() => setStepIndex(index)}><span>{index + 1}</span>{item.title}</button>)}</div>
            <article className="tour-explanation" aria-live="polite"><span className="tour-eyebrow">ETAPA {stepIndex + 1} DE {topic.steps.length}</span><h4>{step.title}</h4><p>{step.description}</p><dl>{step.items.map(([label, explanation]) => <div key={label}><dt>{label}</dt><dd>{explanation}</dd></div>)}</dl></article>
            <footer className="tour-footer"><button type="button" className="tour-secondary" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft size={15} /> Anterior</button><button type="button" className="tour-secondary" onClick={() => { navigate(topic.path); close(); }}>Abrir {topic.title}</button><button type="button" className="tour-primary" disabled={stepIndex === topic.steps.length - 1} onClick={() => setStepIndex((current) => current + 1)}>Próxima etapa <ArrowRight size={15} /></button></footer>
          </div>
        </div>
      </section>
    </div>}
  </>;
}
