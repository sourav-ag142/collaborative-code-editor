
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";

// Local development uses port 5001.
// For a deployed frontend, set VITE_SOCKET_URL to your Render backend URL.
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://collaborative-code-editor-api-oxz7.onrender.com";

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

const INITIAL_CODE = "// start code here";

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(INITIAL_CODE);
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");
  const [errorMessage, setErrorMessage] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  // Prevent a received code update from being emitted again.
  const remoteCodeRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const onConnect = () => {
      console.log("Connected to backend:", socket.id);
      setConnectionStatus("Connected");
    };

    const onConnectError = (error) => {
      console.error("Socket connection error:", error.message);
      setConnectionStatus("Connection failed");
    };

    const onDisconnect = () => {
      setConnectionStatus("Disconnected");
    };

    const onUserJoined = (userList) => {
      setUsers(userList);
    };

    const onRoomState = (state) => {
      remoteCodeRef.current = state.code;
      setCode(state.code);
      setLanguage(state.language);
    };

    const onCodeUpdate = (newCode) => {
      remoteCodeRef.current = newCode;
      setCode(newCode);
    };

    const onUserTyping = (user) => {
      setTyping(`${user} is typing...`);

      clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        setTyping("");
      }, 1500);
    };

    const onLanguageUpdate = (newLanguage) => {
      setLanguage(newLanguage);
    };

    const onAppError = (message) => {
      setErrorMessage(message);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("userJoined", onUserJoined);
    socket.on("roomState", onRoomState);
    socket.on("codeUpdate", onCodeUpdate);
    socket.on("userTyping", onUserTyping);
    socket.on("languageUpdate", onLanguageUpdate);
    socket.on("appError", onAppError);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.off("userJoined", onUserJoined);
      socket.off("roomState", onRoomState);
      socket.off("codeUpdate", onCodeUpdate);
      socket.off("userTyping", onUserTyping);
      socket.off("languageUpdate", onLanguageUpdate);
      socket.off("appError", onAppError);

      clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, []);

  const joinRoom = (e) => {
    e.preventDefault();

    const cleanRoomId = roomId.trim();
    const cleanUserName = userName.trim();

    if (!cleanRoomId || !cleanUserName) {
      setErrorMessage("Enter both a room ID and your name.");
      return;
    }

    setErrorMessage("");
    setRoomId(cleanRoomId);
    setUserName(cleanUserName);

    socket.emit("join", {
      roomId: cleanRoomId,
      userName: cleanUserName,
    });

    setJoined(true);
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");

    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode(INITIAL_CODE);
    setLanguage("javascript");
    setUsers([]);
    setTyping("");
    setErrorMessage("");
    remoteCodeRef.current = null;
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess("Copied!");

      setTimeout(() => setCopySuccess(""), 2000);
    } catch {
      setCopySuccess("Copy failed");
    }
  };

  const handleCodeChange = (newCode) => {
    if (newCode === undefined) return;

    // Monaco may call onChange when a remote value is applied.
    // Do not broadcast that update back to the room.
    if (remoteCodeRef.current === newCode) {
      remoteCodeRef.current = null;
      return;
    }

    setCode(newCode);

    if (!joined || !socket.connected) return;

    socket.emit("codeChange", {
      code: newCode,
    });

    socket.emit("typing");
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;

    setLanguage(newLanguage);

    if (joined && socket.connected) {
      socket.emit("languageChange", {
        language: newLanguage,
      });
    }
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput("Please write some code first.");
      return;
    }

    setIsRunning(true);
    setOutput("Running code...");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "https://collaborative-code-editor-api-oxz7.onrender.com"}/api/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            language,
            input: customInput,
          }),
        });

      const result = await response.json();

      if (!response.ok) {
        setOutput(result.error || "Failed to run code.");
        return;
      }

      const resultOutput = result.output || "";
      const resultError = result.error || "";

      if (resultError) {
        setOutput(
          resultOutput
            ? `${resultOutput}\n${resultError}`
            : resultError
        );
      } else if (resultOutput) {
        setOutput(resultOutput);
      } else {
        setOutput("Code executed successfully. No output.");
      }
    } catch (error) {
      setOutput("Could not connect to the backend. Is it running?");
    } finally {
      setIsRunning(false);
    }
  };


  if (!joined) {
    return (
      <div className="join-container">
        <form className="join-form" onSubmit={joinRoom}>
          <h1>Join Code Room</h1>

          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />

          <button type="submit">Join Room</button>

          <p>Connection: {connectionStatus}</p>

          {errorMessage && <p>{errorMessage}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Code Room: {roomId}</h2>

          <button
            onClick={copyRoomId}
            className="copy-button"
          >
            Copy ID
          </button>

          {copySuccess && (
            <span className="copy-success">
              {copySuccess}
            </span>
          )}
        </div>

        <p>Connection: {connectionStatus}</p>

        <h3>Users in Room:</h3>

        <ul>
          {users.map((user, index) => (
            <li key={`${user}-${index}`}>{user}</li>
          ))}
        </ul>

        <p className="typing-indicator">{typing}</p>

        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>

        <button
          className="leave-button"
          onClick={leaveRoom}
        >
          Leave Room
        </button>

        {errorMessage && <p>{errorMessage}</p>}
      </div>


      <div className="editor-wrapper">
        <div className="editor-toolbar">
          <button
            className="run-button"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "▶ Run Code"}
          </button>
        </div>

        <div className="monaco-container">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>

        <div className="execution-panel">
          <label htmlFor="custom-input">Custom Input (stdin)</label>
          <textarea
            id="custom-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Enter input for your program here..."
            rows={3}
          />

          <label htmlFor="program-output">Output</label>
          <pre id="program-output">
            {output || "Your program output will appear here."}
          </pre>
        </div>
      </div>

    </div>
  );
};

export default App;
