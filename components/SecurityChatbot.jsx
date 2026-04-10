import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ScrollView, 
    ActivityIndicator, KeyboardAvoidingView, Platform, 
    Animated, Keyboard, Modal
} from 'react-native';
import { MessageSquare, Send, Bot, Loader2, Minimize2 } from 'lucide-react-native';
import API from "../services/api";

const SecurityChatbot = ({ scanId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scanId && isOpen) {
            fetchChatHistory();
        }
    }, [scanId, isOpen]);

    const fetchChatHistory = async () => {
        try {
            const res = await API.get(`/chatbot/${scanId}`);
            const history = res.data.flatMap(chat => [
                { role: 'user', text: chat.question },
                { role: 'bot', text: chat.answer }
            ]);
            setMessages(history);
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !scanId) return;
        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);
        try {
            const res = await API.post("/chatbot/chat", { scanId, question: userMsg });
            setMessages(prev => [...prev, { role: 'bot', text: res.data.answer }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "Error: Service unreachable." }]);
        } finally {
            setLoading(false);
        }
    };

    const renderBotMessage = (text) => {
        const sections = text.split(/(Answer:|Key Findings:|Technical Reasoning:|PQC Assessment:|Risk Evaluation:|Recommendations:)/g);
        return (
            <View className="space-y-2">
                {sections.map((part, index) => {
                    const trimmed = part.trim();
                    if (!trimmed) return null;
                    const headerMap = {
                        "Answer:": { label: "Direct Answer", color: "text-amber-600" },
                        "Key Findings:": { label: "Key Findings", color: "text-blue-600" },
                        "Technical Reasoning:": { label: "Technical Reasoning", color: "text-slate-500" },
                        "PQC Assessment:": { label: "PQC Assessment", color: "text-purple-600" },
                        "Risk Evaluation:": { label: "Risk Evaluation", color: "text-red-600" },
                        "Recommendations:": { label: "Strategic Steps", color: "text-emerald-600" }
                    };
                    if (headerMap[trimmed]) {
                        return <Text key={index} className={`text-[9px] font-black uppercase mt-2 ${headerMap[trimmed].color}`}>{headerMap[trimmed].label}</Text>;
                    }
                    return (
                        <View key={index}>
                            {trimmed.split('\n').map((line, lIdx) => (
                                <Text key={lIdx} className={`text-[11px] leading-4 mb-1 text-slate-700 font-medium ${line.startsWith('-') ? 'pl-3 border-l-2 border-slate-100' : ''}`}>
                                    {line}
                                </Text>
                            ))}
                        </View>
                    );
                })}
            </View>
        );
    };

    if (!isOpen) return (
        <TouchableOpacity 
            onPress={() => setIsOpen(true)}
            activeOpacity={0.8}
            style={{ position: 'absolute', bottom: 30, right: 30, zIndex: 9999 }}
            className="bg-slate-900 p-4 rounded-full shadow-2xl border border-amber-500/20"
        >
            <MessageSquare size={24} color="#f59e0b" />
        </TouchableOpacity>
    );

    return (
        /* Use a Modal or a Full Screen View to ensure the KeyboardAvoidingView works */
        <Modal visible={isOpen} transparent animationType="slide">
            <View className="flex-1 justify-end bg-black/20">
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1 justify-end"
                >
                    {/* The actual Chat Window */}
                    <View className="bg-white rounded-t-[3rem] shadow-2xl overflow-hidden h-[80%] border-t border-slate-200">
                        {/* Header */}
                        <View className="bg-slate-900 p-5 flex-row justify-between items-center">
                            <View className="flex-row items-center gap-3">
                                <Bot size={20} color="#f59e0b" />
                                <View>
                                    <Text className="text-[10px] font-black text-white uppercase tracking-widest">Kavachai Analyst</Text>
                                    <Text className="text-[8px] text-slate-500 font-bold">ID: {scanId?.substring(0, 8)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setIsOpen(false)}>
                                <Minimize2 size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        {/* Messages Area */}
                        <ScrollView 
                            ref={scrollRef}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                            className="flex-1 p-5 bg-slate-50/50"
                            keyboardShouldPersistTaps="handled"
                        >
                            {messages.map((msg, i) => (
                                <View key={i} className={`flex-row mb-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <View className={`max-w-[85%] p-4 rounded-3xl shadow-sm ${msg.role === 'user' ? 'bg-slate-900 rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                                        {msg.role === 'user' ? <Text className="text-white text-[12px] font-medium">{msg.text}</Text> : renderBotMessage(msg.text)}
                                    </View>
                                </View>
                            ))}
                            {loading && (
                                <View className="flex-row justify-start mb-5">
                                    <View className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none">
                                        <ActivityIndicator size="small" color="#f59e0b" />
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Input Area */}
                        <View className="p-5 bg-white border-t border-slate-100 flex-row gap-2 items-center" style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 20 }}>
                            <TextInput
                                value={input}
                                onChangeText={setInput}
                                placeholder="Ask analyst..."
                                placeholderTextColor="#94a3b8"
                                className="flex-1 bg-slate-50 rounded-2xl px-5 py-3 text-[12px] font-bold text-slate-900 shadow-inner"
                            />
                            <TouchableOpacity onPress={handleSendMessage} disabled={loading || !scanId} className="bg-slate-900 p-4 rounded-2xl items-center justify-center">
                                <Send size={18} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

export default SecurityChatbot;