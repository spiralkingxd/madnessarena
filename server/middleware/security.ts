import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Constantes para configuração de rate limiting
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const API_MAX_REQUESTS = 100;
const AUTH_MAX_REQUESTS = 20;
const STRICT_MAX_REQUESTS = 5;

/**
 * Segurança: Rate Limiting Global para API
 * CORREÇÃO #38: Extrair magic numbers para constantes
 * Previne ataques de força bruta e DDoS limitando o número de requisições por IP.
 * O limite geral da API é de 100 requisições a cada 15 minutos.
 */
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: API_MAX_REQUESTS,
  message: { error: 'Muitas requisições deste IP, tente novamente em 15 minutos.' },
  standardHeaders: true, // Retorna rate limit info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita os headers `X-RateLimit-*`
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Segurança: Rate Limiting Estrito para Autenticação
 * Limite mais rigoroso para rotas de login/logout para evitar brute-force.
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  message: { error: 'Muitas tentativas de autenticação, tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Segurança: Rate Limiting Extra Estrito para Ações Críticas
 * Para ações como ban, deletar conta, transferir propriedade
 */
export const strictLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: STRICT_MAX_REQUESTS,
  message: { error: 'Limite de ações críticas excedido. Aguarde 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Segurança: Helmet com CSP Restritivo
 * CORREÇÃO #11: Remover unsafe-eval e unsafe-inline em produção
 * 
 * Adiciona headers HTTP de segurança (X-Frame-Options, X-Content-Type-Options, etc).
 * O CSP (Content Security Policy) é configurado de forma mais restritiva.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // CORRIGIDO: Remover unsafe-eval e inline em produção
      scriptSrc: 
        process.env.NODE_ENV === 'production'
          ? ["'self'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Apenas em dev
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Necessário para Tailwind CSS
        "https://fonts.googleapis.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      // CORRIGIDO: Restringir imgSrc apenas para domínios confiáveis
      imgSrc: [
        "'self'",
        "data:",
        "https://cdn.discordapp.com",
        // Adicionar domínio do Supabase Storage quando implementar upload
        process.env.VITE_SUPABASE_URL ? new URL(process.env.VITE_SUPABASE_URL).origin : '',
      ].filter(Boolean),
      connectSrc: [
        "'self'",
        "https://discord.com",
        process.env.VITE_SUPABASE_URL || '',
      ].filter(Boolean),
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false, // Desabilitado para permitir imagens de terceiros (Discord avatars)
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});
