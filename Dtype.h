#pragma once

#include "JsonEx.h"

class Dtype: public JsonEx{
public:

	struct Ex{
		enum class Type{
			unknown_t, // 型が不明。データ型として取り扱う。文字列型やオブジェクトの可能性もある。
			int_t,     // 整数型
			float_t,   // 浮動小数点数型
			string_t,  // 文字列型
			data_t,    // データ型
			object_t,  // 型構造体
		};
		uint32_t id{};
		Type type{Type::unknown_t};
		bool is_array{false};
		std::string name{};
	};
	Ex *ex(Node &node)noexcept{return reinterpret_cast<Ex *>(node.ex);}

	Node *push_back_int(Node &parent, uint32_t id)noexcept;
	Node *push_back_float(Node &parent, uint32_t id)noexcept;
	Node *push_back_unknown(Node &parent, uint32_t id)noexcept;

	Node *search_id(Node &parent_object, uint32_t id)const noexcept;
	Node *search_name(Node &parent_object, const std::string &name)const noexcept;

private:
	bool _load(Node &node)noexcept;
	bool _save(Node &node)noexcept;
	
	std::list<Ex> _exes{};
};
