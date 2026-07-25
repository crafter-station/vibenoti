import {
  IconEnvelopeFillDuo18,
  IconUserFillDuo18,
} from "nucleo-ui-essential-fill-duo-18";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

interface AccountSettingsProps {
  email: string;
  name: string;
}

export function AccountSettings({ name, email }: AccountSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Your basic VibeNoti account details.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-2">
          <Item variant="muted">
            <ItemMedia variant="icon">
              <IconUserFillDuo18 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Name</ItemTitle>
              <ItemDescription>{name}</ItemDescription>
            </ItemContent>
          </Item>
          <Item variant="muted">
            <ItemMedia variant="icon">
              <IconEnvelopeFillDuo18 />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Email</ItemTitle>
              <ItemDescription>{email}</ItemDescription>
            </ItemContent>
          </Item>
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
