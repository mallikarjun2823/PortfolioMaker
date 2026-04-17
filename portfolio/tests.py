from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Portfolio, Section


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
