export const appBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function appPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${appBasePath}${normalized}`;
}

export function appOriginPath(origin: string, path: string) {
  return `${origin.replace(/\/$/, "")}${appPath(path)}`;
}
