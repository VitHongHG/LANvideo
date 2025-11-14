import React, { useState, useRef, useEffect, useCallback } from 'react';

interface BroadcasterProps {
    onOfferCreated: (offer: RTCSessionDescriptionInit) => void;
    onIceCandidate: (candidate: RTCIceCandidate) => void;
    answer: RTCSessionDescriptionInit | null;
    viewerIceCandidates: RTCIceCandidate[];
    onStreamingStateChange: (isStreaming: boolean) => void;
    onReset: () => void;
}

const CameraIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1 1 0 011.45.89V16.11a1 1 0 01-1.45.89L15 14M5 9h10a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
    </svg>
);


const Broadcaster: React.FC<BroadcasterProps> = ({ 
    onOfferCreated, 
    onIceCandidate, 
    answer, 
    viewerIceCandidates, 
    onStreamingStateChange,
    onReset
}) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    const stopStreaming = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        setIsStreaming(false);
        onStreamingStateChange(false);
        onReset();
    }, [localStream, onStreamingStateChange, onReset]);

    const startStreaming = async () => {
        onReset();
        setError(null); // Clear previous errors
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            setIsStreaming(true);
            onStreamingStateChange(true);

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = event => {
                if (event.candidate) {
                    onIceCandidate(event.candidate);
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            onOfferCreated(offer);
        } catch (err) {
            console.error("Error starting stream:", err);
            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setError("Permission Denied. This app needs access to your camera and microphone to stream. Please grant access in your browser's address bar and click 'Start Streaming' again.");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                    setError("No devices found. Please ensure a camera and microphone are connected and not in use by another application.");
                } else {
                    setError(`An error occurred: ${err.message}. Please check your device and browser settings.`);
                }
            } else {
                setError("An unknown error occurred while trying to start the stream.");
            }
            setIsStreaming(false);
            onStreamingStateChange(false);
        }
    };

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        const setAnswer = async () => {
            if (peerConnectionRef.current && answer && peerConnectionRef.current.signalingState === 'have-local-offer') {
                try {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (error) {
                    console.error("Error setting remote description:", error);
                }
            }
        };
        setAnswer();
    }, [answer]);
    
    useEffect(() => {
        const addCandidates = async () => {
            if (peerConnectionRef.current && viewerIceCandidates.length > 0) {
                 for (const candidate of viewerIceCandidates) {
                    try {
                        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (error) {
                        console.error('Error adding received ICE candidate', error);
                    }
                }
            }
        };
        addCandidates();
    }, [viewerIceCandidates]);


    return (
        <div className="bg-gray-800 rounded-lg shadow-2xl p-6 flex flex-col h-full">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-400 flex items-center">
                <CameraIcon className="w-6 h-6 mr-2" />
                Broadcaster
            </h2>
            <div className="aspect-video bg-black rounded-md mb-4 flex items-center justify-center relative overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"></video>
                {!localStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                        <CameraIcon className="w-16 h-16" />
                        <p className="mt-2">Your webcam feed will appear here</p>
                    </div>
                )}
            </div>
            {isStreaming ? (
                <button
                    onClick={stopStreaming}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                    Stop Streaming
                </button>
            ) : (
                <button
                    onClick={startStreaming}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
                >
                    Start Streaming
                </button>
            )}
            {error && (
                <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm text-center" role="alert">
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default Broadcaster;