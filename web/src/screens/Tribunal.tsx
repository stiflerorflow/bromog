import { useState } from "react";
import { currentUser, getSessions } from "../data/store";
import { lapsedAmendable, weekId, weekSlots, type SlotInfo } from "../data/schedule";
import { useStore } from "../components/useStore";
import { useNow } from "../components/useNow";

interface Props {
  onProceed: (workoutKey: string) => void;
  onDismiss: () => void;
}

// The Skippies Tribunal: a deliberately over-the-top, >=3-tap mock-court flow that
// is the *only* sanctioned path to perform a lapsed session out of window. The
// friction is the feature; the copy is the feature.
export function Tribunal({ onProceed, onDismiss }: Props) {
  const user = useStore(currentUser);
  const sessions = useStore(() => getSessions(user));
  const now = useNow();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Lock onto the case at petition time so a mid-flow clock tick can't switch which
  // lapsed session is being amended (the applicant confessed to a specific one).
  const [chosen, setChosen] = useState<SlotInfo | null>(null);
  const lapsed = chosen ?? lapsedAmendable(weekSlots(sessions, now, null));

  // No matter before the court — out of window with a clean week.
  if (!lapsed) {
    return (
      <Court>
        <h1>⚖️ No matter before it ⚖️</h1>
        <p>
          The Court finds <strong>no matter before it</strong>. All sessions of Week{" "}
          {weekId(now)} stand complete.
        </p>
        <p>The applicant is commended, and dismissed. Costs awarded to no one.</p>
        <p className="court-aside">
          ⚖️ Unscheduled freestyle sessions lack standing before this Court. ⚖️
        </p>
        <p className="court-aside">Go home.</p>
        <div className="court-actions">
          <button className="btn-block" onClick={onDismiss}>
            Withdraw
          </button>
        </div>
      </Court>
    );
  }

  const day = lapsed.workout.day;
  const date = lapsed.window.start.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const caseNo = `${weekId(now)}-${lapsed.workout.slotId}`;

  if (step === 1) {
    return (
      <Court>
        <h1>⚖️ THE TRIBUNAL OF SANCTIONED HOURS ⚖️</h1>
        <p className="court-aside">In session. Reluctantly.</p>
        <p>
          The Court observes that the present hour falls <strong>outside all sanctioned
          training windows</strong> (cf. Schedule of Institutions, §2).
        </p>
        <p>Nevertheless, an applicant stands before the bench. Gym bag in evidence. Intent apparent.</p>
        <p>How does the applicant wish to proceed?</p>
        <div className="court-actions">
          <button
            className="btn-primary btn-block"
            onClick={() => {
              setChosen(lapsed);
              setStep(2);
            }}
          >
            I petition the Court
          </button>
          <button className="btn-block" onClick={onDismiss}>
            Withdraw without prejudice
          </button>
        </div>
      </Court>
    );
  }

  if (step === 2) {
    return (
      <Court>
        <h1>Allocution</h1>
        <p>The Court requires allocution before it will consider relief.</p>
        <p>
          On the matter of <strong>{day}, {date}</strong>, the record reflects a session
          scheduled and not performed.
        </p>
        <p>
          Does the applicant stipulate that a <strong>SKIPPIES</strong> occurred?
        </p>
        <div className="court-actions">
          <button className="btn-primary btn-block" onClick={() => setStep(3)}>
            A Skippies occurred. I so stipulate.
          </button>
        </div>
        <p className="court-aside">
          (No plea of "not guilty" is available. The Court has reviewed the logs. The logs
          are dispositive.)
        </p>
      </Court>
    );
  }

  return (
    <Court>
      <h1>⚖️ JUDGMENT IS ENTERED ⚖️</h1>
      <p>
        <strong>Case No. {caseNo}</strong> — <em>In re: the Skippies of {day}</em>
      </p>
      <p>
        <strong>FINDING:</strong> Skippies, one (1) count. Stipulated in open court.
      </p>
      <p>
        <strong>ORDER:</strong> The applicant is granted leave to perform one (1){" "}
        <strong>SKIPPIES AMENDMENT SESSION</strong>, to be entered into the permanent record
        with full training credit and partial dignity.
      </p>
      <p>The Court notes its mercy. The Court further notes that mercy is not precedent.</p>
      <div className="court-actions">
        <button className="btn-primary btn-block" onClick={() => onProceed(lapsed.workout.key)}>
          Proceed under order of the Court
        </button>
        <button className="btn-block" onClick={onDismiss}>
          Move to dismiss (flee)
        </button>
      </div>
    </Court>
  );
}

function Court({ children }: { children: React.ReactNode }) {
  return (
    <div className="court scroll">
      <div className="court-seal">⚖️</div>
      {children}
    </div>
  );
}
