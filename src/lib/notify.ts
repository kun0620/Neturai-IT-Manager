import { toast } from 'sonner';

type ErrorLike = { message?: string } | string | null | undefined;

const normalize = (detail?: ErrorLike) => {
  if (!detail) return undefined;
  return typeof detail === 'string' ? detail : detail.message;
};

export function notifySuccess(title: string, detail?: string) {
  const description = normalize(detail);
  const options = {
    className: 'toast-success animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300',
  };
  if (description) {
    toast.success(title, { description, ...options });
    return;
  }
  toast.success(title, options);
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
