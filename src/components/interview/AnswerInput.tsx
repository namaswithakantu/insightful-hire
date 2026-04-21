import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onMethod: (m: "text" | "voice") => void;
}

export function AnswerInput({ value, onChange, onMethod }: Props) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseRef = useRef("");

  useEffect(() => onMethod(mode), [mode, onMethod]);

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice not supported in this browser. Use text input.");
      setMode("text");
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baseRef.current = value ? value + " " : "";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      onChange(baseRef.current + final + interim);
      if (final) baseRef.current += final;
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") toast.error("Microphone blocked");
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setRecording(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your answer</label>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => { stopVoice(); setMode("text"); }}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${mode === "text" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Type className="h-3 w-3" /> Text
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${mode === "voice" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Mic className="h-3 w-3" /> Voice
          </button>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); baseRef.current = e.target.value; }}
        placeholder={mode === "voice" ? "Press the mic to start speaking…" : "Type your answer here…"}
        rows={8}
        className="resize-none bg-card font-mono text-sm leading-relaxed"
      />

      {mode === "voice" && (
        <Button
          type="button"
          onClick={recording ? stopVoice : startVoice}
          variant={recording ? "destructive" : "outline"}
          className="w-full"
        >
          {recording ? <><MicOff className="mr-2 h-4 w-4" /> Stop recording</> : <><Mic className="mr-2 h-4 w-4" /> Start recording</>}
        </Button>
      )}

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{value.trim().split(/\s+/).filter(Boolean).length} words</span>
        <span>{value.length} chars</span>
      </div>
    </div>
  );
}
