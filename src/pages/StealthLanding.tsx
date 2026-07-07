import { useMemo, useState } from "react";
import { Shield, EyeOff, CheckCircle2, ArrowRight, Briefcase, Scale, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/mvp/primitives/button";
import { Input } from "@/components/mvp/primitives/input";
import { Textarea } from "@/components/mvp/primitives/textarea";

const valueProps = [
  {
    title: "Defensible sign-off flow",
    description:
      "Review, challenge, and disposition AI-assisted diligence outputs with human reviewer control before IC and legal sign-off.",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  {
    title: "Built for PE and M&A teams",
    description:
      "Focused on high-stakes deal workflows where unsupported assertions and late contradictions create rework and delay risk.",
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    title: "Governance-aligned posture",
    description:
      "Source-linked review artifacts and explicit claim disposition to support internal governance and compliance workflows.",
    icon: <Scale className="w-4 h-4" />,
  },
];

export default function StealthLanding() {
  const [intent, setIntent] = useState<"pilot" | "discovery" | "grant">("pilot");
  const [name, setName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [role, setRole] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isFormComplete = useMemo(() => {
    return Boolean(name.trim() && workEmail.trim() && firm.trim() && role.trim());
  }, [name, workEmail, firm, role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete) return;

    const intentLabel =
      intent === "pilot"
        ? "Pilot conversation"
        : intent === "discovery"
        ? "Discovery call"
        : "Grant context";

    const subject = encodeURIComponent(`Simpero - ${intentLabel} request`);
    const body = encodeURIComponent(
      [
        `Intent: ${intentLabel}`,
        `Name: ${name.trim()}`,
        `Work email: ${workEmail.trim()}`,
        `Firm/Org: ${firm.trim()}`,
        `Role: ${role.trim()}`,
        `Context: ${context.trim() || "N/A"}`,
      ].join("\n")
    );

    window.location.href = `mailto:hello@simpero.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Simpero</p>
              <p className="text-[11px] font-mono text-slate-500">Defensible AI Diligence</p>
            </div>
          </div>
          <a
            href="mailto:hello@simpero.com?subject=Simpero%20Design%20Partner%20Inquiry"
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            Contact
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <section className="grid lg:grid-cols-2 gap-10 items-start mb-14">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-full border border-amber-300 text-amber-700 bg-amber-50 mb-6">
              <EyeOff className="w-3.5 h-3.5" />
            In stealth - private pilot onboarding
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Defensible AI Diligence
              <span className="block text-blue-700">for PE and M&A Teams</span>
            </h1>
            <p className="max-w-xl text-slate-600 leading-relaxed mb-6">
              Simpero helps teams review, challenge, and sign off on high-stakes, AI-assisted diligence outputs
              across full-VDR workflows. Our focus is defensible claim disposition with human reviewer control.
            </p>
            <div className="flex flex-wrap gap-3 mb-3">
              <Button
                onClick={() => setIntent("pilot")}
                className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
              >
                Request pilot
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setIntent("discovery")}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book 20-min discovery call
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Best fit: PE deal leads, VPs, and M&A counsel involved in diligence sign-off.
            </p>
          </div>

          <section id="contact-form" className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-7">
            <h2 className="text-xl font-semibold mb-2">Request conversation</h2>
            <p className="text-sm text-slate-600 mb-5">
              Share a few details and we will follow up within 24 hours.
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              <button
                type="button"
                onClick={() => setIntent("pilot")}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  intent === "pilot"
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-300 text-slate-600 hover:text-slate-900"
                }`}
              >
                Pilot
              </button>
              <button
                type="button"
                onClick={() => setIntent("discovery")}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  intent === "discovery"
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-300 text-slate-600 hover:text-slate-900"
                }`}
              >
                Discovery call
              </button>
              <button
                type="button"
                onClick={() => setIntent("grant")}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  intent === "grant"
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-300 text-slate-600 hover:text-slate-900"
                }`}
              >
                Grant context
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  autoComplete="name"
                  className="bg-white border-slate-300"
                  required
                />
                <Input
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="Work email"
                  type="email"
                  autoComplete="email"
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Input
                  value={firm}
                  onChange={(e) => setFirm(e.target.value)}
                  placeholder="Firm / organization"
                  className="bg-white border-slate-300"
                  required
                />
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Role"
                  className="bg-white border-slate-300"
                  required
                />
              </div>
              <Textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Optional context (current workflow, timeline, grant requirement)"
                className="min-h-[92px] bg-white border-slate-300"
              />

              <div className="flex flex-wrap gap-3 items-center">
                <Button type="submit" disabled={!isFormComplete} className="bg-blue-700 hover:bg-blue-800 text-white">
                  Submit request
                </Button>
                <a
                  href="mailto:hello@simpero.com?subject=Simpero%20Grant%20Application%20Context"
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
                  onClick={() => setIntent("grant")}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Grant contact
                </a>
              </div>
            </form>

            {submitted && (
              <p className="text-xs text-blue-700 mt-4">
                Thank you - we have prefilled your email draft with your request details.
              </p>
            )}
          </section>
        </section>

        <section className="grid md:grid-cols-3 gap-4 mb-10">
          {valueProps.map((item) => (
            <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <h2 className="font-semibold mb-2">{item.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
          <h2 className="text-xl font-semibold mb-3">Why it matters now</h2>
          <p className="text-slate-600 leading-relaxed">
            Foundation models can produce fast answers, but sign-off quality still depends on evidentiary control.
            In deals, unsupported claims and late contradictions can create rework, timeline friction, repricing
            pressure, and escalation risk.
          </p>
        </section>
      </main>
    </div>
  );
}
