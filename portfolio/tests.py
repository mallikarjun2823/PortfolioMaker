from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Block, Element, Portfolio, Section


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
