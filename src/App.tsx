import { GoogleGenAI } from "@google/genai";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Mic, MicOff, RefreshCw, Upload, Wand2, MessageSquare } from "lucide-react";
import React, { useRef, useState } from "react";
import { PixarAvatar } from "./components/PixarAvatar";
import { useGeminiLive } from "./lib/useGeminiLive";

type Step = "landing" | "upload" | "processing" | "chat";

export default function App() {
  const [step, setStep] = useState<Step>("landing");
  const [image, setImage] = useState<string | null>(null);
  const [avatarTraits, setAvatarTraits] = useState({
    hairColor: "#4A2C2A",
    skinTone: "#FAD6A5",
    eyeColor: "#634E34",
    faceShape: 'oval' as const,
    hairStyle: 'short' as const,
    eyeShape: 'normal' as const,
    hasGlasses: false,
    hasBeard: false,
    eyeSize: 1,
    lipColor: "#5C1F1F"
  });
  const [pixarSummary, setPixarSummary] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isConnected,
    connect,
    disconnect,
    volume,
    isThinking
  } = useGeminiLive({
    apiKey: process.env.GEMINI_API_KEY || "",
    systemInstruction: `Bạn là một nhân vật Pixar thân thiện và đầy biểu cảm. 
    Tính cách của bạn ấm áp, hay giúp đỡ và hơi kỳ quặc một chút. 
    Bạn nói chuyện tự nhiên bằng TIẾNG VIỆT. Bạn biết rằng mình từng là một bức ảnh chân dung nhưng giờ đã trở thành một nhân vật 3D sống động.
    Hãy trả lời ngắn gọn, lôi cuốn và luôn sử dụng tiếng Việt.`
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!process.env.GEMINI_API_KEY) {
      alert("Thiếu GEMINI_API_KEY. Vui lòng thêm vào phần Secrets.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setStep("processing");
      processImage(base64.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType: "image/jpeg" } },
            { 
              text: `You are a professional Disney/Pixar character designer. 
              Analyze this photo and extract the Visual DNA of this person to create a faithful 3D animated character version. 
              IT IS CRITICAL that the character retains the person's identity (face structure, eyes, hair, age, and glasses if present).
              
              Return a JSON object with these EXACT fields:
              - 'description': A short poetic description of their Pixar transformation IN VIETNAMESE.
              - 'hairColor': Hex color string.
              - 'skinTone': Hex color string.
              - 'eyeColor': Hex color string.
              - 'lipColor': Hex color string (natural lip tone).
              - 'faceShape': one of ['round', 'oval', 'heart', 'square'].
              - 'hairStyle': one of ['short', 'long', 'bob', 'top-knot', 'bald', 'curly'].
              - 'eyeShape': one of ['normal', 'almond', 'rounded'].
              - 'hasGlasses': boolean.
              - 'hasBeard': boolean (only if visible).
              - 'eyeSize': number (0.8 for small, 1.0 for normal, 1.2 for large/wide).
              
              Analyze carefully: if the person has long hair, set hairStyle to 'long'. If they have a round face, set faceShape to 'round'. Ensure the identity is preserved by matching the relative proportions of their face.` 
            }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || "{}");
      setAvatarTraits({
        hairColor: data.hairColor || "#4A2C2A",
        skinTone: data.skinTone || "#FAD6A5",
        eyeColor: data.eyeColor || "#634E34",
        faceShape: data.faceShape || 'oval',
        hairStyle: data.hairStyle || 'short',
        eyeShape: data.eyeShape || 'normal',
        hasGlasses: !!data.hasGlasses,
        hasBeard: !!data.hasBeard,
        eyeSize: data.eyeSize || 1,
        lipColor: data.lipColor || "#5C1F1F"
      });
      setPixarSummary(data.description || "Tâm hồn Pixar của bạn thật rực rỡ!");
      
      setTimeout(() => setStep("chat"), 2500);
    } catch (error) {
      console.error("Processing failed:", error);
      setStep("upload");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#3D2B1F] font-sans overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center border-b border-[#EED7C1]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FF6B6B] rounded-lg flex items-center justify-center text-white shadow-lg shadow-orange-200">
             <Wand2 size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight uppercase">PixarPulse</span>
        </div>
        {step === "chat" && (
          <button 
            onClick={() => { disconnect(); setStep("upload"); }}
            className="flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          >
            <RefreshCw size={14} /> Làm lại từ đầu
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center max-w-lg"
            >
              <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                Chạm vào <span className="text-[#FF6B6B]">Phép màu 3D.</span>
              </h1>
              <p className="text-lg opacity-80 mb-10 leading-relaxed">
                Tải lên một bức ảnh chân dung và xem chúng tôi biến bạn thành một 
                nhân vật phong cách Pixar sống động. Trò chuyện với chính mình trong thời gian thực.
              </p>
              <button 
                onClick={() => setStep("upload")}
                className="bg-[#3D2B1F] text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-transform shadow-2xl flex items-center gap-3 mx-auto"
              >
                Bắt đầu ngay <Camera size={24} />
              </button>
            </motion.div>
          )}

          {step === "upload" && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border-4 border-dashed border-[#EED7C1] rounded-[2rem] p-12 text-center cursor-pointer hover:border-[#FF6B6B] transition-colors group"
              >
                <div className="w-20 h-20 bg-[#FFF9F2] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                   <Upload className="text-[#FF6B6B]" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Chọn ảnh của bạn</h3>
                <p className="opacity-60 text-sm">Ảnh chân dung sẽ cho kết quả biến hình tốt nhất</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div 
              key="processing"
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative mb-8">
                <motion.div 
                  className="w-48 h-48 rounded-full border-4 border-[#FF6B6B] border-t-transparent mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <motion.div 
                   className="absolute inset-0 flex items-center justify-center"
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ duration: 1.5, repeat: Infinity }}
                >
                   <Wand2 className="text-[#FF6B6B]" size={40} />
                </motion.div>
              </div>
              <h2 className="text-3xl font-bold mb-2 italic">Đang rắc bụi phép thuật...</h2>
              <p className="opacity-60">Phân tích các đường nét để Pixar hóa</p>
            </motion.div>
          )}

          {step === "chat" && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col items-center gap-8"
            >
              {/* The Avatar */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <PixarAvatar 
                  volume={volume} 
                  isThinking={isThinking} 
                  traits={avatarTraits}
                />
                
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl max-w-xs text-center border border-white shadow-sm mt-4">
                   <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Phân tích AI</p>
                   <p className="text-sm italic leading-relaxed">"{pixarSummary.length > 100 ? pixarSummary.substring(0, 100) + '...' : pixarSummary}"</p>
                </div>
              </div>

              {/* Controls */}
              <div className="pb-12 flex flex-col items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={isConnected ? disconnect : connect}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
                    isConnected ? 'bg-red-500' : 'bg-[#FF6B6B]'
                  } text-white`}
                >
                  {isConnected ? <MicOff size={32} /> : <Mic size={32} />}
                </motion.button>
                
                <p className="font-bold text-sm uppercase tracking-wide">
                  {isConnected ? "ĐANG KẾT NỐI! HÃY NÓI GÌ ĐÓ" : "NHẤN ĐỂ BẮT ĐẦU TRÒ CHUYỆN"}
                </p>

                {isConnected && (
                    <motion.div 
                       initial={{ opacity: 0, scale: 0.5 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="flex items-center gap-2 text-[#FF6B6B] font-bold"
                    >
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        ĐANG TRUYỀN ÂM THANH
                    </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Decorative blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-100/50 rounded-full blur-[150px] -z-10" />
    </div>
  );
}

