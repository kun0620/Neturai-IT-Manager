import { toast } from 'sonner';

type ErrorLike = { message?: string } | string | null | undefined;

const normalize = (detail?: ErrorLike) => {
  if (!detail) return undefined;
  return typeof detail === 'string' ? detail : detail.message;
};

export function notifySuccess(title: string, detail?: string) {
  const description = normalize(detail);
  if (description) {
    toast.success(title, { description });
    return;
  }
  toast.success(title);
}

export function notifyError(title: string, detail?: ErrorLike) {
  const description = normalize(detail);
  if (description) {
    toast.error(title, { description });
    return;
  }
  toast.error(title);
}

export function notifyWarning(title: string, detail?: string) {
  const description = normalize(detail);
  if (description) {
    toast.warning(title, { description });
    return;
  }
  toast.warning(title);
}

export function notifyInfo(title: string, detail?: string) {
  const description = normalize(detail);
  if (description) {
    toast.info(title, { description });
    return;
  }
  toast.info(title);
}
