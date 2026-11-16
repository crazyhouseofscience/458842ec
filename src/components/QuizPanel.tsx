import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { HelpCircle, CheckCircle2, XCircle, Award, RotateCcw, ArrowRight } from 'lucide-react';
import { QuizQuestion } from '../types/electrostatics';

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    conceptCategory: 'Triboelectricity',
    question: 'When a Glass Rod is rubbed with Silk Fabric, what microscopic charge movement occurs?',
    options: [
      'Protons move from the Glass Rod to the Silk Fabric.',
      'Electrons move from the Glass Rod to the Silk Fabric.',
      'Electrons move from the Silk Fabric to the Glass Rod.',
      'Protons move from the Silk Fabric to the Glass Rod.',
    ],
    correctIndex: 1,
    explanation:
      'Glass has a lower electron affinity (higher position on the Triboelectric series) than Silk. Friction supplies work to transfer valence electrons from Glass to Silk, leaving Glass positively charged (+). Protons remain fixed inside atomic nuclei!',
  },
  {
    id: 'q2',
    conceptCategory: 'Coulomb Force',
    question:
      'If the separation distance between two point charges is tripled (3r), how does the Coulomb force F change?',
    options: [
      'Increases by a factor of 3',
      'Decreases to 1/3 of its original value',
      'Decreases to 1/9 of its original value',
      'Decreases to 1/6 of its original value',
    ],
    correctIndex: 2,
    explanation:
      'Coulomb’s Law states F = k * q1 * q2 / r². Since force depends inversely on the square of distance (1/r²), tripling r causes F to decrease by (1/3)² = 1/9.',
  },
  {
    id: 'q3',
    conceptCategory: 'Dielectric Polarization',
    question: 'Why does a negatively charged balloon stick to a neutral wooden wall?',
    options: [
      'The wall becomes negatively charged by contact.',
      'The balloon transfers protons to the wall.',
      'The balloon’s negative charge induces atomic dipoles in the wall, repelling electrons and attracting the positive nuclei.',
      'Gravity pushes the balloon against the wall.',
    ],
    correctIndex: 2,
    explanation:
      'In a neutral insulator (dielectric), electrons cannot move freely, but atomic electron clouds shift away from the (-) balloon. This leaves net positive charges closer to the balloon than negative charges, creating a net attractive force!',
  },
  {
    id: 'q4',
    conceptCategory: 'Electric Field & Potential',
    question: 'At a point midway between two equal positive charges (+q and +q), what are the Electric Field E and Electric Potential V?',
    options: [
      'E = 0, V = 0',
      'E = 0, V > 0',
      'E > 0, V = 0',
      'E > 0, V > 0',
    ],
    correctIndex: 1,
    explanation:
      'Vector fields E cancel out at the center (E_left = -E_right, so E = 0). Scalar potentials V add together (V = k q / r + k q / r > 0).',
  },
];

export const QuizPanel: React.FC = () => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const q = QUIZ_QUESTIONS[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    setSelectedOpt(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOpt === null) return;
    setIsSubmitted(true);
    if (selectedOpt === q.correctIndex) {
      setScore((prev) => prev + 1);
      confetti({ particleCount: 35, spread: 50 });
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < QUIZ_QUESTIONS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOpt(null);
      setIsSubmitted(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsSubmitted(false);
    setScore(0);
  };

  const isQuizComplete = isSubmitted && currentIdx === QUIZ_QUESTIONS.length - 1;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-slate-100 flex flex-col gap-5 shadow-xl max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-100">Electrostatics Conceptual Assessment</h3>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
          Score: {score} / {QUIZ_QUESTIONS.length}
        </span>
      </div>

      {!isQuizComplete ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Question {currentIdx + 1} of {QUIZ_QUESTIONS.length}</span>
            <span className="text-amber-400">{q.conceptCategory}</span>
          </div>

          {/* Question Text */}
          <h4 className="text-base font-semibold text-slate-100 leading-snug">{q.question}</h4>

          {/* Options Grid */}
          <div className="space-y-2.5 pt-2">
            {q.options.map((optText, optIdx) => {
              const isSelected = selectedOpt === optIdx;
              const isCorrect = isSubmitted && optIdx === q.correctIndex;
              const isWrong = isSubmitted && isSelected && !isCorrect;

              let styleClasses = 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-200';
              if (isSelected && !isSubmitted) {
                styleClasses = 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-md';
              } else if (isCorrect) {
                styleClasses = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
              } else if (isWrong) {
                styleClasses = 'bg-rose-950/80 border-rose-500 text-rose-200';
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${styleClasses}`}
                >
                  <span className="leading-relaxed">{optText}</span>
                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  {isWrong && <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Explanation Box when Submitted */}
          {isSubmitted && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs leading-relaxed">
              <span className="font-bold text-cyan-400 block">Physics & Chemistry Insight:</span>
              <p className="text-slate-300">{q.explanation}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            {!isSubmitted ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedOpt === null}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-sky-300 text-slate-950 font-bold text-xs rounded-xl hover:from-cyan-300 hover:to-sky-200 transition-all shadow-md shadow-cyan-950/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-all flex items-center gap-2"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Quiz Complete Screen */
        <div className="py-8 text-center space-y-4">
          <Award className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h4 className="text-xl font-bold text-slate-100">Assessment Complete!</h4>
          <p className="text-sm text-slate-300 font-mono">
            Final Score: {score} / {QUIZ_QUESTIONS.length} (
            {Math.round((score / QUIZ_QUESTIONS.length) * 100)}%)
          </p>
          <button
            onClick={handleRestartQuiz}
            className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-all inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Assessment Again</span>
          </button>
        </div>
      )}
    </div>
  );
};
