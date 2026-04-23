const RSD = new Intl.NumberFormat('sr-RS', {
  style: 'currency',
  currency: 'RSD',
  maximumFractionDigits: 0,
});

export const formatRsd = (value: number): string => RSD.format(value);

export const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};
