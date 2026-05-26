const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PUBLIC_ID_PREFIXES = {
  app: "app",
  bucket: "bucket",
  database: "db",
  deployment: "dep",
  node: "node",
  organization: "org",
  project: "proj",
  user: "user",
} as const;

export type PublicIdType = keyof typeof PUBLIC_ID_PREFIXES;
export type PublicIdPrefix = (typeof PUBLIC_ID_PREFIXES)[PublicIdType];
export type PublicId<T extends PublicIdType = PublicIdType> =
  `${(typeof PUBLIC_ID_PREFIXES)[T]}_${string}`;

const TYPE_BY_PREFIX = Object.fromEntries(
  Object.entries(PUBLIC_ID_PREFIXES).map(([type, prefix]) => [prefix, type]),
) as Record<PublicIdPrefix, PublicIdType>;

export class PublicIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicIdError";
  }
}

export type ParsedPublicId = {
  type: PublicIdType | null;
  uuid: string;
  legacy: boolean;
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function formatPublicId<T extends PublicIdType>(type: T, uuid: string): PublicId<T> {
  const normalized = uuid.trim().toLowerCase();
  if (!isUuid(normalized)) {
    throw new PublicIdError(`Invalid UUID for ${type}.`);
  }
  return `${PUBLIC_ID_PREFIXES[type]}_${normalized}` as PublicId<T>;
}

export function parsePublicId(
  value: string,
  expectedType?: PublicIdType,
  options: { allowLegacyUuid?: boolean } = {},
): ParsedPublicId | null {
  const allowLegacyUuid = options.allowLegacyUuid ?? true;
  const raw = value.trim();
  if (!raw) return null;

  if (isUuid(raw)) {
    if (!allowLegacyUuid) return null;
    return { type: expectedType ?? null, uuid: raw.toLowerCase(), legacy: true };
  }

  const separator = raw.indexOf("_");
  if (separator <= 0) return null;

  const prefix = raw.slice(0, separator) as PublicIdPrefix;
  const uuid = raw.slice(separator + 1).toLowerCase();
  const type = TYPE_BY_PREFIX[prefix];
  if (!type || !isUuid(uuid)) return null;
  if (expectedType && type !== expectedType) return null;
  return { type, uuid, legacy: false };
}

export function assertPublicId(
  value: string,
  expectedType?: PublicIdType,
  options?: { allowLegacyUuid?: boolean },
): ParsedPublicId {
  const parsed = parsePublicId(value, expectedType, options);
  if (!parsed) {
    const suffix = expectedType ? ` for ${expectedType}` : "";
    throw new PublicIdError(`Invalid public ID${suffix}.`);
  }
  return parsed;
}

export function uuidFromPublicId(
  value: string,
  expectedType?: PublicIdType,
  options?: { allowLegacyUuid?: boolean },
): string {
  return assertPublicId(value, expectedType, options).uuid;
}

export function isPublicIdType(value: string, expectedType: PublicIdType): boolean {
  return parsePublicId(value, expectedType, { allowLegacyUuid: false }) !== null;
}

export function withPublicId<T extends { id: string }, K extends PublicIdType>(
  type: K,
  resource: T,
): Omit<T, "id"> & { id: PublicId<K> } {
  return {
    ...resource,
    id: formatPublicId(type, resource.id),
  };
}
