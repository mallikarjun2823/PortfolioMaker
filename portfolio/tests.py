from __future__ import annotations

from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from PIL import Image

from .models import Block, Element, Experience, Portfolio, PortfolioTemplate, Project, ResumeUpload, Section, Skill, Theme


class SectionCRUDTests(APITestCase):
	def setUp(self):
		self.User = get_user_model()
		self.user = self.User.objects.create_user(username="alice", password="password123")
		self.other_user = self.User.objects.create_user(username="bob", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.user,
			title="Alice Portfolio",
			slug="alice-portfolio",
			description="",
			theme=None,
			is_published=False,
		)

	def test_auth_required(self):
		url = reverse("section-list-create", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_owner_enforced(self):
		self.client.force_authenticate(user=self.other_user)
		url = reverse("section-list-create", kwargs={"portfolio_id": self.portfolio.id})

		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

		res = self.client.post(url, data={"name": "About", "config": {}}, format="json")
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_crud_and_ordering(self):
		self.client.force_authenticate(user=self.user)
		list_url = reverse("section-list-create", kwargs={"portfolio_id": self.portfolio.id})

		res = self.client.get(list_url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json(), [])

		# Create without order (auto append)
		res = self.client.post(list_url, data={"name": "About Me"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		about_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.post(list_url, data={"name": "Projects", "config": {}}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		projects_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 2)

		# Insert at the top (order=1) should shift existing sections down.
		res = self.client.post(list_url, data={"name": "Hero", "order": 1, "config": {}}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		hero_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(list_url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [hero_id, about_id, projects_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Move "Projects" to the top.
		detail_url = reverse(
			"section-detail",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": projects_id},
		)
		res = self.client.patch(detail_url, data={"order": 1}, format="json")
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(list_url)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [projects_id, hero_id, about_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Delete middle and ensure order is compacted.
		hero_detail_url = reverse(
			"section-detail",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": hero_id},
		)
		res = self.client.delete(hero_detail_url)
		self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

		res = self.client.get(list_url)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [projects_id, about_id])
		self.assertEqual([item["order"] for item in items], [1, 2])

	def test_validations(self):
		self.client.force_authenticate(user=self.user)
		list_url = reverse("section-list-create", kwargs={"portfolio_id": self.portfolio.id})

		res = self.client.post(list_url, data={"name": "   "}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(list_url, data={"name": "About", "order": 0}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(list_url, data={"name": "About", "config": []}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		# PUT requires all fields.
		create = self.client.post(list_url, data={"name": "About"}, format="json")
		section_id = create.json()["id"]
		detail_url = reverse(
			"section-detail",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": section_id},
		)
		res = self.client.put(detail_url, data={"name": "About", "order": 1, "is_visible": True}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class SectionPermissionTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="owner", password="password123")
		self.attacker = User.objects.create_user(username="attacker", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Owner Portfolio",
			slug="owner-portfolio",
			description="",
			theme=None,
			is_published=False,
		)
		self.section = Section.objects.create(
			portfolio=self.portfolio,
			name="About",
			order=1,
			is_visible=True,
			config={},
		)

	def test_non_owner_cannot_access_section_detail(self):
		self.client.force_authenticate(user=self.attacker)
		url = reverse(
			"section-detail",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class BlockCRUDTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="block_owner", password="password123")
		self.other = User.objects.create_user(username="block_other", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Blocks Portfolio",
			slug="blocks-portfolio",
			description="",
			theme=None,
			is_published=False,
		)
		self.section = Section.objects.create(
			portfolio=self.portfolio,
			name="Section 1",
			order=1,
			is_visible=True,
			config={},
		)

	def test_auth_required(self):
		url = reverse(
			"block-list-create",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_owner_enforced(self):
		self.client.force_authenticate(user=self.other)
		url = reverse(
			"block-list-create",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)

		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

		res = self.client.post(url, data={"type": "LIST"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_crud_and_ordering(self):
		self.client.force_authenticate(user=self.owner)
		list_url = reverse(
			"block-list-create",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)

		res = self.client.get(list_url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json(), [])

		# Create without order (auto append)
		res = self.client.post(list_url, data={"type": "LIST"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		b1_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.post(list_url, data={"type": "GRID", "config": {}}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		b2_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 2)

		# Insert at top should shift existing blocks down.
		res = self.client.post(list_url, data={"type": "TIMELINE", "order": 1, "config": {}}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		b3_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(list_url)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [b3_id, b1_id, b2_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Move last to top.
		detail_url = reverse(
			"block-detail",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": b2_id,
			},
		)
		res = self.client.patch(detail_url, data={"order": 1}, format="json")
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(list_url)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [b2_id, b3_id, b1_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Delete middle and ensure order is compacted.
		mid_detail_url = reverse(
			"block-detail",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": b3_id,
			},
		)
		res = self.client.delete(mid_detail_url)
		self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

		res = self.client.get(list_url)
		items = res.json()
		self.assertEqual([item["id"] for item in items], [b2_id, b1_id])
		self.assertEqual([item["order"] for item in items], [1, 2])

	def test_validations(self):
		self.client.force_authenticate(user=self.owner)
		list_url = reverse(
			"block-list-create",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)

		res = self.client.post(list_url, data={"type": "   "}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(list_url, data={"type": "LIST", "order": 0}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(list_url, data={"type": "LIST", "config": []}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		# PUT requires all fields.
		create = self.client.post(list_url, data={"type": "LIST"}, format="json")
		block_id = create.json()["id"]
		detail_url = reverse(
			"block-detail",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": block_id,
			},
		)
		res = self.client.put(detail_url, data={"type": "LIST", "order": 1, "is_visible": True}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

	def test_grid_type_rejects_existing_mixed_element_sources(self):
		self.client.force_authenticate(user=self.owner)

		block_list_url = reverse(
			"block-list-create",
			kwargs={"portfolio_id": self.portfolio.id, "section_id": self.section.id},
		)
		res = self.client.post(block_list_url, data={"type": "LIST"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		block_id = res.json()["id"]

		element_list_url = reverse(
			"element-list-create",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": block_id,
			},
		)
		res = self.client.post(
			element_list_url,
			data={"label": "Project Title", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)

		res = self.client.post(
			element_list_url,
			data={"label": "Skill Name", "data_source": "SKILL", "field": "name"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)

		block_detail_url = reverse(
			"block-detail",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": block_id,
			},
		)
		res = self.client.patch(block_detail_url, data={"type": "GRID"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ElementCRUDTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="element_owner", password="password123")
		self.other = User.objects.create_user(username="element_other", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Elements Portfolio",
			slug="elements-portfolio",
			description="",
			theme=None,
			is_published=False,
		)
		self.section = Section.objects.create(
			portfolio=self.portfolio,
			name="Section 1",
			order=1,
			is_visible=True,
			config={},
		)
		self.block = Block.objects.create(
			section=self.section,
			type="LIST",
			order=1,
			is_visible=True,
			config={},
		)

	def _list_url(self):
		return reverse(
			"element-list-create",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": self.block.id,
			},
		)

	def _detail_url(self, element_id: int):
		return reverse(
			"element-detail",
			kwargs={
				"portfolio_id": self.portfolio.id,
				"section_id": self.section.id,
				"block_id": self.block.id,
				"element_id": element_id,
			},
		)

	def test_auth_required(self):
		res = self.client.get(self._list_url())
		self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_owner_enforced(self):
		self.client.force_authenticate(user=self.other)
		res = self.client.get(self._list_url())
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

		res = self.client.post(
			self._list_url(),
			data={"label": "Title", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_crud_and_ordering(self):
		self.client.force_authenticate(user=self.owner)

		res = self.client.get(self._list_url())
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json(), [])

		res = self.client.post(
			self._list_url(),
			data={"label": "Title", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		e1_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.post(
			self._list_url(),
			data={"label": "Description", "data_source": "PROJECT", "field": "description", "config": {}},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		e2_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 2)

		# Insert at top shifts existing down.
		res = self.client.post(
			self._list_url(),
			data={"label": "GitHub", "data_source": "PROJECT", "field": "github_url", "order": 1, "config": {}},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		e3_id = res.json()["id"]
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(self._list_url())
		items = res.json()
		self.assertEqual([item["id"] for item in items], [e3_id, e1_id, e2_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Move last to top.
		res = self.client.patch(self._detail_url(e2_id), data={"order": 1}, format="json")
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json()["order"], 1)

		res = self.client.get(self._list_url())
		items = res.json()
		self.assertEqual([item["id"] for item in items], [e2_id, e3_id, e1_id])
		self.assertEqual([item["order"] for item in items], [1, 2, 3])

		# Toggle visibility.
		res = self.client.patch(self._detail_url(e3_id), data={"is_visible": False}, format="json")
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertEqual(res.json()["is_visible"], False)

		# Delete middle and ensure order is compacted.
		res = self.client.delete(self._detail_url(e3_id))
		self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

		res = self.client.get(self._list_url())
		items = res.json()
		self.assertEqual([item["id"] for item in items], [e2_id, e1_id])
		self.assertEqual([item["order"] for item in items], [1, 2])

	def test_validations_and_mapping(self):
		self.client.force_authenticate(user=self.owner)

		res = self.client.post(
			self._list_url(),
			data={"label": "   ", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(
			self._list_url(),
			data={"label": "Title", "data_source": "PROJECT", "field": "title", "order": 0},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.post(
			self._list_url(),
			data={"label": "Title", "data_source": "PROJECT", "field": "title", "config": []},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		# Field must match the selected source.
		res = self.client.post(
			self._list_url(),
			data={"label": "Bad", "data_source": "PROJECT", "field": "name"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		# Unique (block, data_source, field).
		res = self.client.post(
			self._list_url(),
			data={"label": "Title", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)

		res = self.client.post(
			self._list_url(),
			data={"label": "Title 2", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		# PUT requires all fields.
		element = Element.objects.filter(block=self.block).first()
		detail_url = self._detail_url(element.id)
		res = self.client.put(detail_url, data={"label": "X"}, format="json")
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

	def test_grid_block_rejects_mixed_data_sources(self):
		self.client.force_authenticate(user=self.owner)
		self.block.type = "GRID"
		self.block.save(update_fields=["type"])

		res = self.client.post(
			self._list_url(),
			data={"label": "Project Title", "data_source": "PROJECT", "field": "title"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		e1_id = res.json()["id"]

		res = self.client.post(
			self._list_url(),
			data={"label": "Project Description", "data_source": "PROJECT", "field": "description"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)

		res = self.client.post(
			self._list_url(),
			data={"label": "Skill Name", "data_source": "SKILL", "field": "name"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

		res = self.client.patch(
			self._detail_url(e1_id),
			data={"data_source": "SKILL", "field": "name"},
			format="json",
		)
		self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class PortfolioRenderTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="owner2", password="password123")
		self.attacker = User.objects.create_user(username="attacker2", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Render Me",
			slug="render-me",
			description="",
			theme=None,
			is_published=False,
		)
		Section.objects.create(
			portfolio=self.portfolio,
			name="About",
			order=1,
			is_visible=True,
			config={},
		)

	def test_auth_required(self):
		url = reverse("portfolio-render", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_owner_only(self):
		self.client.force_authenticate(user=self.attacker)
		url = reverse("portfolio-render", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_render_preview_unpublished(self):
		self.client.force_authenticate(user=self.owner)
		url = reverse("portfolio-render", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		data = res.json()
		self.assertIn("portfolio", data)
		self.assertEqual(data["portfolio"]["title"], "Render Me")
		self.assertIsInstance(data["portfolio"]["sections"], list)
		self.assertEqual(data["portfolio"]["sections"][0]["name"], "About")

	def test_public_render_by_slug_no_auth_for_published(self):
		self.portfolio.is_published = True
		self.portfolio.save(update_fields=["is_published"])

		url = reverse("portfolio-render-public-slug", kwargs={"slug": self.portfolio.slug})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		data = res.json()
		self.assertIn("portfolio", data)
		self.assertEqual(data["portfolio"]["slug"], self.portfolio.slug)

	def test_public_render_by_slug_hidden_when_unpublished(self):
		self.portfolio.is_published = False
		self.portfolio.save(update_fields=["is_published"])

		url = reverse("portfolio-render-public-slug", kwargs={"slug": self.portfolio.slug})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_render_payload_includes_theme_sections_and_data(self):
		theme = Theme.objects.create(
			name="Render Theme",
			config={"primary_color": "#111827", "text_color": "#f9fafb"},
			is_active=True,
			is_default=False,
		)
		self.portfolio.theme = theme
		self.portfolio.save(update_fields=["theme"])

		Project.objects.create(
			portfolio=self.portfolio,
			title="Project A",
			description="Description",
			order=1,
			is_visible=True,
		)
		Skill.objects.create(
			portfolio=self.portfolio,
			name="Python",
			level=5,
			order=1,
			is_visible=True,
		)
		Experience.objects.create(
			portfolio=self.portfolio,
			company="Acme",
			role="Engineer",
			timeline="2021-2024",
			order=1,
			is_visible=True,
		)

		self.client.force_authenticate(user=self.owner)
		url = reverse("portfolio-render", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)

		payload = res.json()
		self.assertIn("theme", payload)
		self.assertIn("sections", payload)
		self.assertIn("data", payload)
		self.assertEqual(payload["theme"]["name"], "Render Theme")
		self.assertEqual(len(payload["data"]["projects"]), 1)
		self.assertEqual(len(payload["data"]["skills"]), 1)
		self.assertEqual(len(payload["data"]["experience"]), 1)


class PortfolioResumeUploadTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(username="resume_owner", password="password123")

	def test_portfolio_resume_upload_and_render_preview(self):
		self.client.force_authenticate(user=self.user)
		portfolio_url = reverse("portfolio-list")

		resume = SimpleUploadedFile(
			"resume.txt",
			b"Experienced backend developer",
			content_type="text/plain",
		)

		res = self.client.post(
			portfolio_url,
			data={
				"title": "Resume Portfolio",
				"slug": "resume-portfolio",
				"description": "With resume",
				"resume": resume,
			},
			format="multipart",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		portfolio_id = res.json()["id"]
		self.assertTrue(res.json().get("resume"))

		render_url = reverse("portfolio-render", kwargs={"portfolio_id": portfolio_id})
		res = self.client.get(render_url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)
		self.assertTrue(res.json()["portfolio"].get("resume"))


class ProjectFileUploadTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(username="project_file_owner", password="password123")
		self.portfolio = Portfolio.objects.create(
			user=self.user,
			title="Projects Portfolio",
			slug="projects-portfolio",
			description="",
			theme=None,
			is_published=False,
		)

	def test_project_image_upload_via_multipart(self):
		self.client.force_authenticate(user=self.user)
		list_url = reverse("project-list-create", kwargs={"portfolio_id": self.portfolio.id})

		buf = BytesIO()
		Image.new("RGB", (1, 1), color=(255, 0, 0)).save(buf, format="PNG")
		buf.seek(0)
		image = SimpleUploadedFile(
			"demo.png",
			buf.getvalue(),
			content_type="image/png",
		)

		res = self.client.post(
			list_url,
			data={
				"title": "Image Project",
				"description": "Project with image",
				"image": image,
				"is_visible": True,
			},
			format="multipart",
		)
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		project_id = res.json()["id"]
		self.assertTrue(res.json().get("image"))

		project = Project.objects.get(id=project_id)
		self.assertTrue(bool(project.image))


class PortfolioTemplateApiTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="template_owner", password="password123")
		self.other = User.objects.create_user(username="template_other", password="password123")

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Template Portfolio",
			slug="template-portfolio",
			description="",
			theme=None,
			is_published=False,
		)

		old_section = Section.objects.create(
			portfolio=self.portfolio,
			name="Old Section",
			order=1,
			is_visible=True,
			config={},
		)
		old_block = Block.objects.create(
			section=old_section,
			type="LIST",
			order=1,
			is_visible=True,
			config={},
		)
		Element.objects.create(
			block=old_block,
			label="Old Title",
			data_source="PROJECT",
			field="title",
			order=1,
			is_visible=True,
			config={},
		)

		self.template = PortfolioTemplate.objects.create(
			name="Starter Template",
			description="Quick starter",
			is_active=True,
			config={
				"sections": [
					{
						"type": "HERO",
						"order": 0,
						"blocks": [
							{
								"type": "KEY_VALUE",
								"order": 0,
								"elements": [
									{
										"label": "Title",
										"data_source": "PORTFOLIO",
										"field": "title",
										"order": 0,
									}
								],
							}
						],
					},
					{
						"type": "PROJECTS",
						"order": 1,
						"blocks": [
							{
								"type": "GRID",
								"order": 0,
								"elements": [
									{
										"label": "Project Title",
										"data_source": "PROJECT",
										"field": "title",
										"order": 0,
									},
									{
										"label": "Project Description",
										"data_source": "PROJECT",
										"field": "description",
										"order": 1,
									},
								],
							}
						],
					},
				],
			},
		)

		PortfolioTemplate.objects.create(
			name="Inactive Template",
			description="Should not be listed",
			is_active=False,
			config={"sections": []},
		)

	def test_list_templates_returns_only_active(self):
		self.client.force_authenticate(user=self.owner)
		url = reverse("template-list")
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)

		items = res.json()
		self.assertEqual(len(items), 1)
		self.assertEqual(items[0]["name"], "Starter Template")

	def test_apply_template_replaces_existing_layout(self):
		self.client.force_authenticate(user=self.owner)
		url = reverse("portfolio-apply-template", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.post(url, data={"template_id": self.template.id}, format="json")
		self.assertEqual(res.status_code, status.HTTP_200_OK)

		result = res.json()
		self.assertEqual(result["sections_created"], 2)
		self.assertEqual(result["blocks_created"], 2)
		self.assertEqual(result["elements_created"], 3)

		sections = list(Section.objects.filter(portfolio=self.portfolio).order_by("order", "id"))
		self.assertEqual(len(sections), 2)
		self.assertEqual([s.order for s in sections], [1, 2])
		self.assertEqual(sections[0].config.get("type"), "HERO")
		self.assertEqual(sections[1].config.get("type"), "PROJECTS")

		blocks = list(Block.objects.filter(section__portfolio=self.portfolio).order_by("section_id", "order", "id"))
		self.assertEqual(len(blocks), 2)
		self.assertEqual([b.order for b in blocks], [1, 1])

		elements = list(Element.objects.filter(block__section__portfolio=self.portfolio).order_by("block_id", "order", "id"))
		self.assertEqual(len(elements), 3)
		self.assertEqual([e.order for e in elements], [1, 1, 2])

	def test_apply_template_requires_owner(self):
		self.client.force_authenticate(user=self.other)
		url = reverse("portfolio-apply-template", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.post(url, data={"template_id": self.template.id}, format="json")
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class PortfolioOverviewApiTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="overview_owner", password="password123")
		self.other = User.objects.create_user(username="overview_other", password="password123")

		theme = Theme.objects.create(
			name="Overview Theme",
			config={"primary_color": "#111827"},
			is_active=True,
			is_default=False,
		)

		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Overview Portfolio",
			slug="overview-portfolio",
			description="Overview",
			theme=theme,
			is_published=False,
		)

		Section.objects.create(
			portfolio=self.portfolio,
			name="Layout Section",
			order=1,
			is_visible=True,
			config={},
		)
		Project.objects.create(
			portfolio=self.portfolio,
			title="Overview Project",
			description="Desc",
			order=1,
			is_visible=True,
		)
		Skill.objects.create(
			portfolio=self.portfolio,
			name="Django",
			level=5,
			order=1,
			is_visible=True,
		)
		Experience.objects.create(
			portfolio=self.portfolio,
			company="Org",
			role="Lead",
			timeline="2020-2025",
			order=1,
			is_visible=True,
		)

	def test_overview_returns_domain_data_without_layout(self):
		self.client.force_authenticate(user=self.owner)
		url = reverse("portfolio-overview", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_200_OK)

		payload = res.json()
		self.assertIn("portfolio", payload)
		self.assertIn("projects", payload)
		self.assertIn("skills", payload)
		self.assertIn("experience", payload)
		self.assertNotIn("sections", payload)
		self.assertEqual(len(payload["projects"]), 1)
		self.assertEqual(len(payload["skills"]), 1)
		self.assertEqual(len(payload["experience"]), 1)

	def test_overview_requires_owner(self):
		self.client.force_authenticate(user=self.other)
		url = reverse("portfolio-overview", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class ResumeImportApiTests(APITestCase):
	def setUp(self):
		User = get_user_model()
		self.owner = User.objects.create_user(username="resume_import_owner", password="password123")
		self.other = User.objects.create_user(username="resume_import_other", password="password123")
		self.portfolio = Portfolio.objects.create(
			user=self.owner,
			title="Import Portfolio",
			slug="import-portfolio",
			description="",
			theme=None,
			is_published=False,
		)

	@patch("portfolio.services.OllamaClient.generate")
	def test_import_resume_creates_draft_and_applies_on_explicit_save(self, mocked_generate):
		mocked_generate.return_value = """
{
  "projects": [
    {
      "title": "Portfolio Builder",
      "description": "Built portfolio app",
      "technologies": ["Django", "React"]
    }
  ],
  "experience": [
    {
      "company": "Acme",
      "role": "Software Engineer",
      "duration": "2022-2025",
      "description": "Built APIs"
    }
  ],
  "education": [
    {
      "institution": "XYZ University",
      "degree": "B.Tech CSE",
      "duration": "2018-2022"
    }
  ],
  "skills": ["Python", "Django", "React"]
}
""".strip()

		self.client.force_authenticate(user=self.owner)
		resume = SimpleUploadedFile("resume.txt", b"sample resume content", content_type="text/plain")
		url = reverse("portfolio-import-resume", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.post(url, data={"file": resume}, format="multipart")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)

		body = res.json()
		self.assertEqual(body["status"], "COMPLETED")
		upload_id = body["upload_id"]

		upload = ResumeUpload.objects.get(id=upload_id)
		self.assertEqual(upload.status, "COMPLETED")
		self.assertIsInstance(upload.parsed_data, dict)

		# Import should only produce draft data, not domain records yet.
		self.assertEqual(Project.objects.filter(portfolio=self.portfolio).count(), 0)
		self.assertEqual(Experience.objects.filter(portfolio=self.portfolio).count(), 0)
		self.assertEqual(Skill.objects.filter(portfolio=self.portfolio).count(), 0)

		draft_url = reverse("portfolio-resume-draft", kwargs={"portfolio_id": self.portfolio.id})
		draft_res = self.client.get(draft_url)
		self.assertEqual(draft_res.status_code, status.HTTP_200_OK)
		draft_body = draft_res.json()
		self.assertEqual(draft_body["status"], "COMPLETED")
		self.assertEqual(draft_body["upload_id"], upload_id)
		self.assertIn("parsed_data", draft_body["upload"])

		apply_url = reverse(
			"portfolio-resume-draft-apply",
			kwargs={"portfolio_id": self.portfolio.id, "upload_id": upload_id},
		)
		apply_res = self.client.post(apply_url, data={}, format="json")
		self.assertEqual(apply_res.status_code, status.HTTP_200_OK)
		self.assertEqual(apply_res.json()["projects_created"], 1)
		self.assertEqual(apply_res.json()["experiences_created"], 2)
		self.assertEqual(apply_res.json()["skills_created"], 3)

		self.assertEqual(Project.objects.filter(portfolio=self.portfolio).count(), 1)
		self.assertEqual(Experience.objects.filter(portfolio=self.portfolio).count(), 2)
		self.assertEqual(Skill.objects.filter(portfolio=self.portfolio).count(), 3)

		upload.refresh_from_db()
		self.assertIsNone(upload.parsed_data)

		education = Experience.objects.filter(portfolio=self.portfolio, company="XYZ University").first()
		self.assertIsNotNone(education)
		self.assertTrue("Education" in education.role)

		status_url = reverse("resume-upload-status", kwargs={"upload_id": upload_id})
		status_res = self.client.get(status_url)
		self.assertEqual(status_res.status_code, status.HTTP_200_OK)
		self.assertEqual(status_res.json()["status"], "COMPLETED")

	@patch("portfolio.services.OllamaClient.generate")
	def test_import_resume_marks_failed_when_llm_returns_invalid_json(self, mocked_generate):
		mocked_generate.return_value = "not-json"
		self.client.force_authenticate(user=self.owner)

		resume = SimpleUploadedFile("resume.txt", b"sample resume content", content_type="text/plain")
		url = reverse("portfolio-import-resume", kwargs={"portfolio_id": self.portfolio.id})
		res = self.client.post(url, data={"file": resume}, format="multipart")
		self.assertEqual(res.status_code, status.HTTP_201_CREATED)
		self.assertEqual(res.json()["status"], "FAILED")

		upload = ResumeUpload.objects.get(id=res.json()["upload_id"])
		self.assertEqual(upload.status, "FAILED")
		self.assertTrue(bool(upload.error))

	def test_resume_upload_status_is_owner_scoped(self):
		upload = ResumeUpload.objects.create(
			user=self.owner,
			portfolio=self.portfolio,
			file=SimpleUploadedFile("resume.txt", b"abc", content_type="text/plain"),
			status=ResumeUpload.Status.PENDING,
		)

		self.client.force_authenticate(user=self.other)
		url = reverse("resume-upload-status", kwargs={"upload_id": upload.id})
		res = self.client.get(url)
		self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

	def test_resume_draft_and_apply_are_owner_scoped(self):
		upload = ResumeUpload.objects.create(
			user=self.owner,
			portfolio=self.portfolio,
			file=SimpleUploadedFile("resume.txt", b"abc", content_type="text/plain"),
			status=ResumeUpload.Status.COMPLETED,
			parsed_data={"projects": [{"title": "X", "description": "Y", "technologies": []}], "experience": [], "education": [], "skills": []},
		)

		self.client.force_authenticate(user=self.other)
		draft_url = reverse("portfolio-resume-draft", kwargs={"portfolio_id": self.portfolio.id})
		draft_res = self.client.get(draft_url)
		self.assertEqual(draft_res.status_code, status.HTTP_404_NOT_FOUND)

		apply_url = reverse(
			"portfolio-resume-draft-apply",
			kwargs={"portfolio_id": self.portfolio.id, "upload_id": upload.id},
		)
		apply_res = self.client.post(apply_url, data={}, format="json")
		self.assertEqual(apply_res.status_code, status.HTTP_404_NOT_FOUND)
