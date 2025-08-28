import NetInfo from '@react-native-community/netinfo';

// Configuración de timeout para verificaciones de red
const NETWORK_TIMEOUT = 10000; // 10 segundos
const PING_URLS = [
  'https://www.google.com',
  'https://www.cloudflare.com',
  'https://www.recuerdamed.org'
];

// Verificar conectividad de red de forma robusta
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // 1. Verificar estado básico de red
    const netInfo = await NetInfo.fetch();
    const hasBasicConnection = netInfo.isConnected && netInfo.isInternetReachable;
    
    if (!hasBasicConnection) {
      console.log('[Network] Sin conexión básica de red');
      return false;
    }
    
    // 2. Verificar conectividad real con ping
    const pingResults = await Promise.allSettled(
      PING_URLS.map(url => pingUrl(url))
    );
    
    // Si al menos un ping es exitoso, consideramos que hay conectividad
    const successfulPings = pingResults.filter(result => 
      result.status === 'fulfilled' && result.value === true
    );
    
    const hasRealConnection = successfulPings.length > 0;
    
    console.log(`[Network] Ping results: ${successfulPings.length}/${PING_URLS.length} successful`);
    
    return hasRealConnection;
  } catch (error) {
    console.error('[Network] Error verificando conectividad:', error);
    return false;
  }
}

// Hacer ping a una URL específica
async function pingUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log(`[Network] Ping failed for ${url}:`, error);
    return false;
  }
}

// Verificar conectividad específica para la API
export async function checkApiConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);
    
    const response = await fetch('https://www.recuerdamed.org/api/health', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache',
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('[Network] API connectivity check failed:', error);
    return false;
  }
}

// Monitorear cambios de conectividad
export function setupNetworkMonitoring(
  onConnectivityChange: (isOnline: boolean) => void
) {
  return NetInfo.addEventListener(state => {
    const isOnline = state.isConnected && state.isInternetReachable;
    console.log('[Network] Connectivity state changed:', isOnline);
    onConnectivityChange(isOnline || false);
  });
}

// Obtener información detallada de la red
export async function getNetworkInfo() {
  try {
    const netInfo = await NetInfo.fetch();
    return {
      isConnected: netInfo.isConnected,
      isInternetReachable: netInfo.isInternetReachable,
      type: netInfo.type,
      isWifi: netInfo.type === 'wifi',
      isCellular: netInfo.type === 'cellular',
      details: netInfo.details,
    };
  } catch (error) {
    console.error('[Network] Error getting network info:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
      isWifi: false,
      isCellular: false,
      details: null,
    };
  }
}
