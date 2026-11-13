"use client";

import React, { useState, useRef } from "react";
import {
  Radio,
  Mic,
  MicOff,
  Link2,
  Check,
  Copy,
  Volume2,
  X,
} from "lucide-react";

export default function WalkieTalkie() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<
    "disconnected" | "waiting" | "connected"
  >("disconnected");
  const [isTalking, setIsTalking] = useState(false);
  const [signalCode, setSignalCode] = useState("");
  const [remoteCode, setRemoteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const playChirp = (freqStart = 1200, freqEnd = 1600) => {
    try {
      const ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        freqEnd,
        ctx.currentTime + 0.08,
      );
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  };

  const initPeer = async (isHost: boolean) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((t) => (t.enabled = false));
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
          setStatus("disconnected");
        }
      };

      pc.onicecandidate = (e) => {
        if (!e.candidate && pc.localDescription) {
          setSignalCode(btoa(JSON.stringify(pc.localDescription)));
        }
      };

      if (isHost) {
        setStatus("waiting");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
      }
    } catch {
      alert("Microphone permission is needed for Atlas Team Radio.");
    }
  };

  const acceptRemoteSignal = async () => {
    if (!remoteCode.trim()) return;
    try {
      const desc = JSON.parse(atob(remoteCode.trim()));
      if (desc.type === "offer") {
        await initPeer(false);
        const pc = pcRef.current!;
        await pc.setRemoteDescription(desc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        setStatus("waiting");
      } else if (desc.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(desc);
        setStatus("connected");
      }
    } catch {
      alert("Invalid pairing code.");
    }
  };

  const startTalking = () => {
    if (!streamRef.current) return;
    playChirp(1100, 1500);
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
    setIsTalking(true);
  };

  const stopTalking = () => {
    if (!streamRef.current) return;
    playChirp(1500, 950);
    streamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
    setIsTalking(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(signalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="funky-btn-primary fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full font-black text-xs cursor-pointer"
        title="Atlas Team Radio (Offline Walkie-Talkie)"
      >
        <Radio
          className={`w-4 h-4 ${status === "connected" ? "animate-pulse text-red-300" : ""}`}
        />
        <span>Team Radio</span>
      </button>

      <audio ref={remoteAudioRef} autoPlay />

      {isOpen && (
        <div className="fixed bottom-34 right-4 z-50 w-80 glass-modal p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black text-sm">
              <Radio className="w-4 h-4" />
              <span>Atlas Team Radio</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="funky-btn p-1.5 rounded-full bg-[var(--accent-secondary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-muted)]">
            Zero internet required: Connect phones to one local hotspot, pair
            once, and hold to talk.
          </p>

          {status !== "connected" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => initPeer(true)}
                className="funky-btn w-full py-2.5 rounded-2xl font-bold text-xs bg-[var(--accent-secondary)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Link2 className="w-4 h-4" />
                <span>1. Create Convoy Channel (Host)</span>
              </button>

              {signalCode && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold">
                    Share code with friend:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      readOnly
                      value={signalCode}
                      className="w-full text-xs p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] truncate focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyCode}
                      title="Copy Share Code"
                      aria-label="Copy Share Code"
                      className="funky-btn-primary px-3 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
                <label className="text-[11px] font-bold">
                  2. Or paste friend&apos;s code:
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={remoteCode}
                    onChange={(e) => setRemoteCode(e.target.value)}
                    placeholder="Paste code..."
                    className="w-full text-xs p-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={acceptRemoteSignal}
                    className="funky-btn-primary px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer shrink-0"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-3 space-y-3">
              <button
                type="button"
                onMouseDown={startTalking}
                onMouseUp={stopTalking}
                onTouchStart={startTalking}
                onTouchEnd={stopTalking}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center font-black text-xs transition select-none cursor-pointer ${
                  isTalking
                    ? "funky-btn bg-red-500 text-white scale-95"
                    : "funky-btn-primary"
                }`}
              >
                {isTalking ? (
                  <Mic className="w-8 h-8 mb-1" />
                ) : (
                  <MicOff className="w-8 h-8 mb-1" />
                )}
                {isTalking ? "TALKING..." : "HOLD TO TALK"}
              </button>
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Volume2 className="w-3.5 h-3.5" /> Local Wi-Fi P2P Active
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
