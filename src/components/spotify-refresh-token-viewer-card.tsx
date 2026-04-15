"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useRouter } from "next/navigation";
import qs from "fast-querystring";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { z } from "zod";

type SpotifyRefreshTokenViewerCardProps = {
  code: string;
};

const spotifyApiTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string().transform((value) => value.split(" ")),
});

export const SpotifyRefreshTokenViewerCard = ({
  code,
}: SpotifyRefreshTokenViewerCardProps) => {
  const router = useRouter();

  const [spotifyApiTokenResponse, setSpotifyApiTokenResponse] =
    useState<z.infer<typeof spotifyApiTokenResponseSchema>>();
  const [isCopiedAccessToken, setIsCopiedAccessToken] = useState(false);
  const [isCopiedRefreshToken, setIsCopiedRefreshToken] = useState(false);

  const copyAccessTokenToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopiedAccessToken(true);
      toast.success("Access token copied to clipboard");
      setTimeout(() => setIsCopiedAccessToken(false), 2000);
    } catch {
      toast.error("Failed to copy", { description: "Clipboard access was denied." });
    }
  };

  const copyRefreshTokenToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopiedRefreshToken(true);
      toast.success("Refresh token copied to clipboard");
      setTimeout(() => setIsCopiedRefreshToken(false), 2000);
    } catch {
      toast.error("Failed to copy", { description: "Clipboard access was denied." });
    }
  };

  const copyAllAsJson = async (data: object) => {
    try {
      const json = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(json);
      toast.success("JSON copied to clipboard");
    } catch {
      toast.error("Failed to copy", { description: "Clipboard access was denied." });
    }
  };

  const goBack = () => {
    router.replace("/");
  };

  useEffect(() => {
    const spotifyClientId = localStorage.getItem("spotify_client_id");
    const spotifyClientSecret = localStorage.getItem("spotify_client_secret");
    const redirectUri = localStorage.getItem("redirect_uri");

    if (!spotifyClientId || !spotifyClientSecret || !redirectUri) {
      toast.error(
        "Spotify Client ID, Client Secret, and Redirect URI are required"
      );
      return;
    }

    const Authorization = `Basic ${btoa(
      `${spotifyClientId}:${spotifyClientSecret}`
    )}`;

    fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization,
      },
      body: qs.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const parsedData = spotifyApiTokenResponseSchema.safeParse(data);

        if (!parsedData.success) {
          toast.error("Failed to parse Spotify token response", {
            description: data?.error_description ?? data?.error ?? "Unexpected response from Spotify",
          });
          router.replace("/");
          return;
        }

        toast.success("Spotify API Token Response", {
          description: "Refresh Token has been generated",
        });

        setSpotifyApiTokenResponse(parsedData.data);

        localStorage.removeItem("spotify_client_id");
        localStorage.removeItem("spotify_client_secret");
        localStorage.removeItem("redirect_uri");

        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      })
      .catch((error) => {
        console.error("Failed to fetch Spotify token:", error);
        toast.error("Failed to fetch token", {
          description: "A network error occurred. Please try again.",
        });
        router.replace("/");
      });
  }, [code]);

  if (!spotifyApiTokenResponse) {
    return <p className="animate-pulse text-center">Generating...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spotify Token Information</CardTitle>
        <CardDescription>
          Your generated Spotify tokens and related information
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-token">Access Token</Label>
          <div className="flex space-x-2">
            <Input
              id="access-token"
              value={spotifyApiTokenResponse.access_token}
              readOnly
              className="flex-grow font-mono text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() =>
                copyAccessTokenToClipboard(spotifyApiTokenResponse.access_token)
              }
              title="Copy access token"
            >
              {isCopiedAccessToken ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy access token</span>
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="refresh-token">Refresh Token</Label>
          <div className="flex space-x-2">
            <Input
              id="refresh-token"
              value={spotifyApiTokenResponse.refresh_token}
              readOnly
              className="flex-grow font-mono text-sm"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() =>
                copyRefreshTokenToClipboard(
                  spotifyApiTokenResponse.refresh_token
                )
              }
              title="Copy refresh token"
            >
              {isCopiedRefreshToken ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span className="sr-only">Copy refresh token</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires-in">Expires In</Label>
          <Input
            id="expires-in"
            value={`${spotifyApiTokenResponse.expires_in} seconds`}
            readOnly
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label>Scopes</Label>
          <ScrollArea className="h-[100px] w-full rounded-md border p-4">
            <div className="flex flex-wrap gap-2">
              {spotifyApiTokenResponse.scope.map((scope, index) => (
                <Badge key={index} variant="secondary">
                  {scope}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          onClick={() => copyAllAsJson(spotifyApiTokenResponse)}
          className="w-full"
        >
          Copy All as JSON
        </Button>

        <Button variant="secondary" onClick={goBack} className="w-full">
          Regenerate Refresh Token
        </Button>
      </CardFooter>
    </Card>
  );
};
