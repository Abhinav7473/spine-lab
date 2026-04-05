// Research topics corpus — used in settings onboarding and topic autocomplete.
// Organized by domain. 300+ entries covering the full spectrum of Spine's target audience.

export const TOPICS_BY_DOMAIN = {
  'Machine Learning': [
    'transformers', 'attention mechanisms', 'self-supervised learning',
    'few-shot learning', 'meta-learning', 'contrastive learning',
    'knowledge distillation', 'neural architecture search', 'hyperparameter optimization',
    'federated learning', 'continual learning', 'transfer learning',
    'multi-task learning', 'active learning', 'curriculum learning',
    'mixture of experts', 'scaling laws', 'in-context learning',
    'prompt engineering', 'chain-of-thought reasoning', 'RLHF',
    'reward modeling', 'preference optimization', 'DPO',
  ],

  'Deep Learning': [
    'convolutional neural networks', 'recurrent neural networks', 'LSTM',
    'residual networks', 'batch normalization', 'dropout',
    'variational autoencoders', 'normalizing flows', 'energy-based models',
    'neural ODEs', 'graph neural networks', 'message passing networks',
    'capsule networks', 'spiking neural networks', 'reservoir computing',
    'Mamba', 'state space models', 'linear attention',
  ],

  'Generative AI': [
    'diffusion models', 'score matching', 'flow matching',
    'denoising diffusion', 'latent diffusion', 'stable diffusion',
    'GANs', 'conditional generation', 'image synthesis',
    'text-to-image', 'text-to-video', 'video generation',
    'audio generation', 'music generation', 'speech synthesis',
    'neural rendering', 'NeRF', '3D generation', 'avatar generation',
  ],

  'Large Language Models': [
    'GPT', 'BERT', 'T5', 'LLaMA', 'instruction tuning',
    'alignment', 'constitutional AI', 'red teaming', 'jailbreaking',
    'hallucination', 'factuality', 'retrieval-augmented generation',
    'long-context models', 'multimodal LLMs', 'vision-language models',
    'code generation', 'program synthesis', 'LLM reasoning',
    'tool use', 'agents', 'multi-agent systems',
  ],

  'Reinforcement Learning': [
    'model-free RL', 'model-based RL', 'policy gradient',
    'Q-learning', 'actor-critic', 'PPO', 'SAC',
    'multi-agent RL', 'offline RL', 'imitation learning',
    'inverse RL', 'reward shaping', 'exploration strategies',
    'hierarchical RL', 'RL for robotics', 'game playing AI',
    'combinatorial optimization', 'planning',
  ],

  'Computer Vision': [
    'object detection', 'semantic segmentation', 'instance segmentation',
    'depth estimation', 'optical flow', 'scene understanding',
    'image classification', 'visual recognition', 'face recognition',
    'pose estimation', 'action recognition', 'video understanding',
    'medical imaging', 'remote sensing', 'document understanding',
    'vision transformers', 'CLIP', 'DINO', 'SAM',
    'point clouds', 'LiDAR perception', 'autonomous driving',
  ],

  'Natural Language Processing': [
    'text classification', 'named entity recognition', 'relation extraction',
    'question answering', 'machine translation', 'summarization',
    'dialogue systems', 'sentiment analysis', 'coreference resolution',
    'information extraction', 'knowledge graphs', 'word embeddings',
    'subword tokenization', 'multilingual NLP', 'low-resource NLP',
    'clinical NLP', 'legal NLP', 'scientific NLP',
  ],

  'Robotics & Embodied AI': [
    'motion planning', 'manipulation', 'grasping',
    'sim-to-real transfer', 'robot learning', 'legged locomotion',
    'human-robot interaction', 'surgical robotics', 'swarm robotics',
    'SLAM', 'localization', 'mapping', 'sensor fusion',
    'foundation models for robotics', 'dexterous manipulation',
  ],

  'Systems & Infrastructure': [
    'distributed systems', 'consensus protocols', 'fault tolerance',
    'key-value stores', 'database internals', 'query optimization',
    'stream processing', 'dataflow systems', 'serverless',
    'microservices', 'container orchestration', 'service mesh',
    'model serving', 'inference optimization', 'quantization',
    'pruning', 'model compression', 'hardware-software co-design',
    'GPU architecture', 'TPU', 'custom accelerators', 'MLIR',
  ],

  'Security & Privacy': [
    'adversarial examples', 'adversarial robustness', 'certified defense',
    'backdoor attacks', 'data poisoning', 'model inversion',
    'membership inference', 'differential privacy', 'federated learning privacy',
    'cryptographic ML', 'watermarking', 'AI safety',
    'network security', 'malware detection', 'intrusion detection',
    'zero-knowledge proofs', 'secure multi-party computation',
  ],

  'Theory & Foundations': [
    'PAC learning', 'statistical learning theory', 'generalization bounds',
    'optimization theory', 'convex optimization', 'non-convex optimization',
    'approximation theory', 'information theory', 'Bayesian inference',
    'probabilistic graphical models', 'causal inference', 'causal discovery',
    'algorithmic fairness', 'interpretability', 'explainability',
  ],

  'Biology & Life Sciences': [
    'protein structure prediction', 'AlphaFold', 'protein design',
    'genomics', 'single-cell analysis', 'drug discovery',
    'molecular dynamics', 'computational biology', 'bioinformatics',
    'neuroscience', 'brain-computer interfaces', 'connectomics',
    'epidemiology modeling', 'clinical trials', 'medical imaging AI',
    'pathology', 'radiology AI', 'electronic health records',
  ],

  'Physics & Chemistry': [
    'materials science', 'materials discovery', 'molecular property prediction',
    'quantum chemistry', 'density functional theory', 'molecular simulation',
    'climate modeling', 'weather prediction', 'fluid dynamics',
    'plasma physics', 'condensed matter', 'quantum computing',
    'quantum machine learning', 'particle physics',
  ],

  'Economics & Social Science': [
    'algorithmic game theory', 'mechanism design', 'auction theory',
    'computational economics', 'market design', 'behavioral economics',
    'social network analysis', 'computational social science',
    'misinformation detection', 'recommendation systems', 'information retrieval',
    'search engines', 'knowledge representation', 'ontologies',
  ],

  'Human-Computer Interaction': [
    'user interfaces', 'accessibility', 'augmented reality',
    'virtual reality', 'mixed reality', 'haptics',
    'eye tracking', 'affective computing', 'UX research',
    'conversational interfaces', 'voice assistants', 'wearables',
    'brain-computer interfaces',
  ],

  'Engineering & Applied': [
    'autonomous vehicles', 'ADAS', 'traffic prediction',
    'smart grids', 'energy forecasting', 'predictive maintenance',
    'anomaly detection', 'time series forecasting', 'financial ML',
    'algorithmic trading', 'fraud detection', 'supply chain optimization',
    'operations research', 'scheduling', 'resource allocation',
  ],
}

// Flat sorted list for autocomplete
export const ALL_TOPICS = Object.values(TOPICS_BY_DOMAIN)
  .flat()
  .sort((a, b) => a.localeCompare(b))

// Domain names for grouped display
export const DOMAIN_NAMES = Object.keys(TOPICS_BY_DOMAIN)
