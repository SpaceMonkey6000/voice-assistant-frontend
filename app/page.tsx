"use client";
import { motion } from "framer-motion";
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, AgentState } from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import { MediaDeviceFailure } from "livekit-client";
import type { ConnectionDetails } from "./api/connection-details/route";
// import { useKrispNoiseFilter } from "@livekit/components-react/krisp";
import { Mic, MicOff } from "lucide-react"; // Using lucide-react for mic icons

export default function Page() {
  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");

  const toggleConnection = useCallback(async () => {
    if (connectionDetails) {
      // If already connected, disconnect
      updateConnectionDetails(undefined);
      setAgentState("disconnected"); // Explicitly reset agent state when disconnecting
    } else {
      // If disconnected, connect
      try {
        const url = new URL(
          process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ??
          "/api/connection-details",
          window.location.origin
        );
        const response = await fetch(url.toString());
        const connectionDetailsData = await response.json();
        updateConnectionDetails(connectionDetailsData);
        setAgentState("connecting"); // Explicitly set connecting state
      } catch (error) {
        console.error("Failed to connect:", error);
        setAgentState("disconnected");
        alert("Failed to connect. Please try again.");
      }
    }
  }, [connectionDetails]);

  // Handle disconnection event from LiveKitRoom component
  const handleDisconnected = useCallback(() => {
    updateConnectionDetails(undefined);
    setAgentState("disconnected");
  }, []);

  return (
    <main
      data-lk-theme="default"
      className="h-full grid content-center bg-[var(--lk-bg)]"
    >
      <LiveKitRoom
        token={connectionDetails?.participantToken}
        serverUrl={connectionDetails?.serverUrl}
        connect={connectionDetails !== undefined}
        audio={true}
        video={false}
        onMediaDeviceFailure={onDeviceFailure}
        onDisconnected={handleDisconnected}
        className="grid grid-rows-[2fr_1fr] items-center"
      >
        <SimpleVoiceAssistant 
          onStateChange={setAgentState} 
          agentState={agentState}
        />
        <MicrophoneButton 
          isConnected={connectionDetails !== undefined}
          isConnecting={agentState === "connecting"}
          onToggle={toggleConnection}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </main>
  );
}

function SimpleVoiceAssistant(props: {
  onStateChange: (state: AgentState) => void;
  agentState: AgentState;
}) {
  const { state, audioTrack } = useVoiceAssistant();
  
  useEffect(() => {
    // Only update parent state if we're connected
    if (state !== "disconnected") {
      props.onStateChange(state);
    }
  }, [props, state]);

  // Only render visualizer when connected and not in disconnected state
  if (props.agentState === "disconnected") return null;

  return (
    <div className="h-[300px] max-w-[90vw] mx-auto">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer"
        options={{ minHeight: 24 }}
      />
    </div>
  );
}

function MicrophoneButton(props: {
  isConnected: boolean;
  isConnecting: boolean;
  onToggle: () => void;
}) {
  /**
   * Use Krisp background noise reduction when available.
  //  * Note: This is only available on Scale plan, see {@link https://livekit.io/pricing | LiveKit Pricing} for more details.
  //  */
  // const krisp = useKrispNoiseFilter();
  // useEffect(() => {
  //   krisp.setNoiseFilterEnabled(true);
  // }, [krisp]);

  // Determine button color based on connection state
  const buttonColor = props.isConnected 
    ? "bg-red-500 hover:bg-red-600" 
    : "bg-blue-500 hover:bg-blue-600";

  return (
    <div className="flex justify-center items-center">
      <motion.button
        className={`rounded-full w-32 h-32 flex items-center justify-center text-white shadow-lg ${buttonColor} transition-colors duration-300`}
        onClick={props.onToggle}
        animate={props.isConnecting ? { scale: [1, 1.1, 1] } : {}}
        transition={props.isConnecting ? { repeat: Infinity, duration: 1.5 } : {}}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={props.isConnecting}
      >
        {props.isConnected ? (
          <MicOff size={48} />
        ) : (
          <Mic size={48} />
        )}
      </motion.button>
    </div>
  );
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error);
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  );
}