export type RequestDeliveryPreviewState = {
  readerPath: string | null
  readerRequestCount: 0 | 1
}

export const INITIAL_REQUEST_DELIVERY_PREVIEW_STATE: RequestDeliveryPreviewState = {
  readerPath: null,
  readerRequestCount: 0,
}

export function beginRequestDeliveryPreview(
  openPath: string,
): RequestDeliveryPreviewState {
  if (!openPath.startsWith('/') || openPath.startsWith('//')) {
    return INITIAL_REQUEST_DELIVERY_PREVIEW_STATE
  }
  return {
    readerPath: openPath,
    readerRequestCount: 1,
  }
}
