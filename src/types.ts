export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type ExperienceMode = 'voice' | 'chat';
