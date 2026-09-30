// mobile/app/(tabs)/assistant.tsx
// Professional AI Exam Stress Copilot & Multi-Format Document Q&A

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { chatApi } from '../../src/api/chatApi';
import { analysisApi } from '../../src/api/analysisApi';
import { ChatMessage, AnalysisSummaryItem, DocumentAttachment } from '../../src/types';
import Colors from '../../src/constants/Colors';
import { readFileAsText, readFileAsBase64 } from '../../src/utils/fileHelper';

const SUGGESTED_PROMPTS = [
  'Summarize key stress findings',
  'How does sleep affect exam performance?',
  'What are evidence-based study techniques?',
  'Which group experienced the highest anxiety?',
  'Give 4 actionable coping strategies',
];

export default function AssistantScreen() {
  const params = useLocalSearchParams<{ analysisId?: string }>();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [analyses, setAnalyses] = useState<AnalysisSummaryItem[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | undefined>(
    params.analysisId
  );
  const [attachedDoc, setAttachedDoc] = useState<DocumentAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadAnalyses();
    initWelcomeMessage();
  }, []);

  useEffect(() => {
    if (params.analysisId) {
      setSelectedAnalysisId(params.analysisId);
    }
  }, [params.analysisId]);

  const loadAnalyses = async () => {
    try {
      const res = await analysisApi.listAnalyses();
      setAnalyses(res.analyses || []);
    } catch (e) {
      console.warn('Failed to load analyses for chat:', e);
    }
  };

  const initWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome-1',
        sender: 'assistant',
        content: `### Welcome to Exam Stress Copilot
I am your specialized analytical companion. I can evaluate your uploaded survey datasets, analyze attached research documents (PDF, Word, PPTX, CSV), and provide grounded psychometric insights.

How I can help:
• Document & Survey Q&A: Tap the paperclip icon below to attach any document and ask questions.
• Statistical Interpretation: Select a dataset above to discuss correlations, sleep factors, and distributions.
• Evidence-Based Strategies: Ask for proven academic stress-reduction and revision methods.

Note: Self-reported survey data reflects questionnaire metrics and does not constitute a medical diagnosis.`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/csv',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      let b64 = '';
      let text = '';

      if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        text = await readFileAsText(file.uri);
      } else {
        b64 = await readFileAsBase64(file.uri);
      }

      setAttachedDoc({
        filename: file.name,
        file_type: ext,
        content_base64: b64 || undefined,
        content_text: text || undefined,
        size_bytes: file.size,
      });
    } catch (err: any) {
      Alert.alert('Attachment Error', err.message || 'Failed to attach document.');
    }
  };


  const handleSend = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message && !attachedDoc) return;
    if (loading) return;

    const currentDoc = attachedDoc;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: message || `Analyze attached document: ${currentDoc?.filename}`,
      document: currentDoc || undefined,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAttachedDoc(null);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage({
        message: message || `Please analyze this attached document: ${currentDoc?.filename}`,
        session_id: sessionId,
        analysis_id: selectedAnalysisId,
        document: currentDoc || undefined,
      });

      if (res.session_id) {
        setSessionId(res.session_id);
      }

      const assistantMsg: ChatMessage = {
        id: res.message_id || `bot-${Date.now()}`,
        sender: 'assistant',
        content: res.assistant_reply,
        created_at: res.created_at || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `Connection Error\n${err.message || 'Unable to generate reply. Please check your connection.'}\n\nSuggestions:\n1. Verify your backend server is running.\n2. Inquire about specific survey variables.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCopy = (text: string, id: string) => {
    // Strip markdown formatting for clean clipboard paste
    const cleanText = text
      .replace(/(\*\*|\*|_|###|##|#|\$#)/g, '')
      .trim();
    Clipboard.setString(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getDocIcon = (ext: string) => {
    const lower = ext.toLowerCase();
    if (lower === 'pdf') return { name: 'file-text', color: '#DC2626' };
    if (lower === 'docx' || lower === 'doc') return { name: 'file-text', color: '#2563EB' };
    if (lower === 'pptx' || lower === 'ppt') return { name: 'airplay', color: '#D97706' };
    if (lower === 'xlsx' || lower === 'xls') return { name: 'grid', color: '#16A34A' };
    return { name: 'file', color: '#FF6B00' };
  };

  // Helper to parse and render inline bold text while removing raw markers
  const renderInlineFormattedText = (rawText: string, textStyle: any, boldStyle: any) => {
    // Clean unwanted characters like $# or excessive markdown markers
    const cleaned = rawText.replace(/\$#/g, '');
    const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={boldStyle}>
            {boldText}
          </Text>
        );
      }
      return (
        <Text key={index} style={textStyle}>
          {part}
        </Text>
      );
    });
  };

  // Structured Content Parser for clean, professional typography
  const renderStructuredContent = (content: string, isUser: boolean) => {
    if (isUser) {
      return <Text style={styles.userMessageText}>{content}</Text>;
    }

    const lines = content.split('\n');

    return (
      <View style={styles.structuredContainer}>
        {lines.map((line, idx) => {
          let trimmed = line.trim();
          if (!trimmed) {
            return <View key={idx} style={{ height: 4 }} />;
          }

          // Strip any stray $#
          trimmed = trimmed.replace(/\$#/g, '');

          // Heading: ### Heading or ## Heading or Section:
          if (trimmed.startsWith('###') || trimmed.startsWith('##') || trimmed.startsWith('# ')) {
            const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
            return (
              <View key={idx} style={styles.headerBlock}>
                <View style={styles.headerIndicator} />
                <Text style={styles.headerText}>{headingText}</Text>
              </View>
            );
          }

          // Numbered list: 1. Item
          if (/^\d+\.\s/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
            const num = numMatch ? numMatch[1] : '•';
            const itemBody = numMatch ? numMatch[2] : trimmed;
            return (
              <View key={idx} style={styles.numberedRow}>
                <View style={styles.numberedBadge}>
                  <Text style={styles.numberedBadgeText}>{num}</Text>
                </View>
                <Text style={styles.numberedBodyText}>
                  {renderInlineFormattedText(itemBody, styles.paragraphText, styles.boldText)}
                </Text>
              </View>
            );
          }

          // Bullet list: • or - or *
          if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[•\-\*]\s*/, '');
            return (
              <View key={idx} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletBodyText}>
                  {renderInlineFormattedText(bulletText, styles.paragraphText, styles.boldText)}
                </Text>
              </View>
            );
          }

          // Disclaimer note: Note: or Disclaimer: or *Note:*
          if (
            trimmed.toLowerCase().startsWith('note:') ||
            trimmed.toLowerCase().startsWith('*note:') ||
            trimmed.toLowerCase().startsWith('disclaimer:')
          ) {
            const noteText = trimmed.replace(/^[\*\_]*(note|disclaimer):[\*\_]*/i, '').replace(/[\*\_]/g, '');
            return (
              <View key={idx} style={styles.disclaimerBox}>
                <Feather name="info" size={13} color="#64748B" />
                <Text style={styles.disclaimerText}>
                  <Text style={{ fontWeight: '700', color: '#475569' }}>Note: </Text>
                  {noteText.trim()}
                </Text>
              </View>
            );
          }

          return (
            <Text key={idx} style={styles.paragraphText}>
              {renderInlineFormattedText(trimmed, styles.paragraphText, styles.boldText)}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.mainScreen, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. Context Selector Ribbon */}
      <View style={styles.contextRibbon}>
        <View style={styles.contextHeaderRow}>
          <View style={styles.contextLabelRow}>
            <Feather name="database" size={13} color="#FF6B00" />
            <Text style={styles.contextLabel}>Grounded Study:</Text>
          </View>
          {selectedAnalysisId ? (
            <TouchableOpacity onPress={() => setSelectedAnalysisId(undefined)}>
              <Text style={styles.clearContextText}>Clear (General Mode)</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextChipsScroll}
        >
          <TouchableOpacity
            style={[
              styles.contextChip,
              !selectedAnalysisId && styles.contextChipActive,
            ]}
            onPress={() => setSelectedAnalysisId(undefined)}
          >
            <Text
              style={[
                styles.contextChipText,
                !selectedAnalysisId && styles.contextChipTextActive,
              ]}
            >
              General AI Mode
            </Text>
          </TouchableOpacity>

          {analyses.map((a) => {
            const isSelected = selectedAnalysisId === a.id;
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.contextChip, isSelected && styles.contextChipActive]}
                onPress={() => setSelectedAnalysisId(a.id)}
              >
                <Text
                  style={[
                    styles.contextChipText,
                    isSelected && styles.contextChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {a.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Chat Message Stream */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isUser = item.sender === 'user';
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser ? (
                <View style={styles.botAvatar}>
                  <Feather name="cpu" size={14} color="#FFFFFF" />
                </View>
              ) : null}

              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                {!isUser ? (
                  <View style={styles.assistantBubbleHeader}>
                    <Text style={styles.assistantName}>Exam Stress Copilot</Text>
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  </View>
                ) : null}

                {/* Attached Document Preview inside message */}
                {item.document ? (
                  <View style={styles.messageDocAttachment}>
                    {(() => {
                      const dInfo = getDocIcon(item.document.file_type);
                      return (
                        <View style={[styles.docIconBox, { backgroundColor: dInfo.color + '18' }]}>
                          <Feather name={dInfo.name as any} size={15} color={dInfo.color} />
                        </View>
                      );
                    })()}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.messageDocTitle} numberOfLines={1}>
                        {item.document.filename}
                      </Text>
                      <Text style={styles.messageDocSub}>Attached Document</Text>
                    </View>
                  </View>
                ) : null}

                {/* Structured Text Content */}
                {renderStructuredContent(item.content, isUser)}

                {/* Action Toolbar for Assistant */}
                {!isUser ? (
                  <View style={styles.assistantToolbar}>
                    <TouchableOpacity
                      style={styles.toolBtn}
                      onPress={() => handleCopy(item.content, item.id)}
                    >
                      <Feather
                        name={copiedId === item.id ? 'check' : 'copy'}
                        size={12}
                        color={copiedId === item.id ? '#16A34A' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.toolBtnText,
                          copiedId === item.id && { color: '#16A34A' },
                        ]}
                      >
                        {copiedId === item.id ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingFooter}>
              <View style={styles.botAvatar}>
                <Feather name="cpu" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#FF6B00" />
                <Text style={styles.typingText}>Analyzing psychometrics...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* 3. Bottom Controls Area - Placed cleanly above the floating capsule tab bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[
          styles.bottomControlsWrapper,
          {
            marginBottom: Math.max(insets.bottom, 14) + 86,
          },
        ]}
      >

        {/* Suggested Prompt Chips Ribbon */}
        {messages.length <= 3 && !loading ? (
          <View style={styles.suggestedContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestedChip}
                  onPress={() => handleSend(prompt)}
                  activeOpacity={0.7}
                >
                  <Feather name="corner-down-right" size={12} color="#FF6B00" />
                  <Text style={styles.suggestedText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Active Attachment Preview Strip */}
        {attachedDoc ? (
          <View style={styles.attachmentStrip}>
            {(() => {
              const dInfo = getDocIcon(attachedDoc.file_type);
              return (
                <View style={[styles.docIconBox, { backgroundColor: dInfo.color + '18' }]}>
                  <Feather name={dInfo.name as any} size={15} color={dInfo.color} />
                </View>
              );
            })()}
            <View style={{ flex: 1 }}>
              <Text style={styles.attachmentFilename} numberOfLines={1}>
                {attachedDoc.filename}
              </Text>
              <Text style={styles.attachmentMeta}>
                {attachedDoc.file_type.toUpperCase()} • Ready to evaluate
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeAttachmentBtn}
              onPress={() => setAttachedDoc(null)}
            >
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 4. Text Input Bar */}
        <View style={styles.inputContainer}>
          {/* Attachment Button */}
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickDocument}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Feather name="paperclip" size={18} color="#0B132B" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={
              attachedDoc
                ? `Ask about ${attachedDoc.filename}...`
                : selectedAnalysisId
                ? 'Ask question about this study...'
                : 'Ask anything or attach doc...'
            }
            placeholderTextColor="#94A3B8"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() && !attachedDoc) || loading
                ? styles.sendBtnDisabled
                : styles.sendBtnActive,
            ]}
            onPress={() => handleSend()}
            disabled={(!inputText.trim() && !attachedDoc) || loading}
            activeOpacity={0.8}
          >
            <Feather
              name="arrow-up"
              size={18}
              color={(!inputText.trim() && !attachedDoc) || loading ? '#94A3B8' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainScreen: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },

  contextRibbon: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contextHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contextLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B132B',
  },
  clearContextText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  contextChipsScroll: {
    gap: 8,
  },
  contextChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contextChipActive: {
    backgroundColor: '#0B132B',
    borderColor: '#0B132B',
  },
  contextChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  contextChipTextActive: {
    color: '#FFFFFF',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 18,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: '#0B132B',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  assistantBubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  assistantName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B132B',
  },
  aiTag: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  aiTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  structuredContainer: {
    gap: 3,
  },
  headerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  headerIndicator: {
    width: 3.5,
    height: 14,
    backgroundColor: '#FF6B00',
    borderRadius: 2,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B132B',
  },
  paragraphText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF6B00',
    marginTop: 7,
  },
  bulletBodyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#1E293B',
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 2.5,
  },
  numberedBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  numberedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  numberedBodyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#1E293B',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  messageDocAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageDocTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B132B',
  },
  messageDocSub: {
    fontSize: 10,
    color: '#64748B',
  },
  assistantToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingTop: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  bottomControlsWrapper: {
    backgroundColor: '#F4F6F9',
    marginBottom: Platform.OS === 'android' ? 88 : 84, // Clean offset above the floating dark tab bar
  },
  suggestedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  suggestedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestedText: {
    fontSize: 12,
    color: '#0B132B',
    fontWeight: '600',
  },
  attachmentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  attachmentFilename: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B132B',
  },
  attachmentMeta: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: '600',
  },
  removeAttachmentBtn: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13.5,
    color: '#0B132B',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#FF6B00',
  },
  sendBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
});

