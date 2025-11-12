#pragma once

#include <stdint.h>
#include <string>
#include <list>

class JsonEx{
public:

	struct Node{
		enum class Type{
			null_t,
			false_t,
			true_t,
			int_t,
			float_t,
			string_t,
			array_t,
			object_t,
		};
		uint32_t line{};
		std::string key{};
		Type type{Type::null_t};
		int32_t value_int{};
		double value_float{};
		std::string value_string{};
		std::list<Node> children{};
		void *ex{nullptr};
	};

	JsonEx()noexcept{}

	Node &root(void)noexcept{return _root;}

	bool load(const char *path)noexcept;
	bool save(const char *path)noexcept;

protected:
	virtual bool _load(Node &node)noexcept{return true;}
	virtual bool _save(Node &node)noexcept{return true;}
	Node _root{};
};
