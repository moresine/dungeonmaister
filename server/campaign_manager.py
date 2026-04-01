import os
import json
import glob
from typing import List, Optional


class CampaignManager:
    """Manages campaign discovery and loading from the campaigns/ directory."""

    def __init__(self, campaigns_dir: str = None):
        # campaigns/ lives one level up from server/
        if campaigns_dir is None:
            campaigns_dir = os.path.join(os.path.dirname(__file__), "..", "campaigns")
        self.campaigns_dir = os.path.abspath(campaigns_dir)

    def list_campaigns(self) -> List[dict]:
        """Scan campaigns/ for directories containing campaign.json."""
        campaigns = []
        if not os.path.isdir(self.campaigns_dir):
            return campaigns

        for entry in sorted(os.listdir(self.campaigns_dir)):
            campaign_dir = os.path.join(self.campaigns_dir, entry)
            meta_path = os.path.join(campaign_dir, "campaign.json")
            if os.path.isdir(campaign_dir) and os.path.isfile(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    meta["_dir"] = campaign_dir
                    campaigns.append(meta)
                except Exception as e:
                    print(f"Warning: Failed to load {meta_path}: {e}")

        return campaigns

    def get_campaign(self, campaign_id: str) -> Optional[dict]:
        """Get a single campaign by ID."""
        for c in self.list_campaigns():
            if c.get("id") == campaign_id:
                return c
        return None

    def get_campaign_content(self, campaign_id: str) -> Optional[str]:
        """Read the full markdown content of a campaign."""
        campaign = self.get_campaign(campaign_id)
        if not campaign:
            return None

        content_file = campaign.get("content_file", "")
        if not content_file:
            return None

        content_path = os.path.join(campaign["_dir"], content_file)
        if not os.path.isfile(content_path):
            print(f"Warning: Content file not found: {content_path}")
            return None

        with open(content_path, "r", encoding="utf-8") as f:
            return f.read()

    def get_campaign_summary(self, campaign_id: str, max_chars: int = 3000) -> Optional[str]:
        """Get a truncated summary of campaign content for the system prompt."""
        content = self.get_campaign_content(campaign_id)
        if not content:
            return None
        # Strip markdown images and return first N characters
        import re
        content = re.sub(r'!\[.*?\]\(.*?\)', '', content)
        content = re.sub(r'\|.*?\|', '', content)  # strip tables
        content = re.sub(r'\n{3,}', '\n\n', content)  # collapse blank lines
        return content[:max_chars].strip()

    def get_cover_image_path(self, campaign_id: str) -> Optional[str]:
        """Get the absolute path to the campaign cover image."""
        campaign = self.get_campaign(campaign_id)
        if not campaign:
            return None

        cover = campaign.get("cover_image", "")
        if not cover:
            return None

        cover_path = os.path.join(campaign["_dir"], cover)
        if os.path.isfile(cover_path):
            return cover_path
        return None
