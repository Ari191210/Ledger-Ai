interface TierGateProps {
  requires: string;
  children: React.ReactNode;
}

export default function TierGate({ children }: TierGateProps) {
  return <>{children}</>;
}
